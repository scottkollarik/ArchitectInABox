import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useDrop } from 'react-dnd'
// icons managed in outer header; none used here
import type { AzureService, SelectedService, ProjectArchitectureState, ProjectProfile } from '../types'
import { getServiceById, azureServiceCatalog } from '../data/azureServices'
import { estimateMonthlyCost } from '../utils/costEstimator'
import { WAF_BASELINE_REASON, WAF_BASELINE_SERVICES, WAF_DYNAMIC_RULES, extractNfrAnswers } from '../data/wafGuidance'
import type { WafRuleContext } from '../data/wafGuidance'
import { useProject } from '../../../context/ProjectContext'
import type { Project } from '../../../context/ProjectContext'
// ArchitectureSection no longer used in list view
import ServiceCard from './architecture/ServiceCard'
import DetailsDrawer from './architecture/DetailsDrawer'

const getAutoIncludeCandidate = (serviceId: string, project: Project): AzureService | undefined => {
  const service = getServiceById(serviceId)
  if (!service) return undefined
  const constraints = project.constraints
  if (constraints?.denyServiceIds && constraints.denyServiceIds.includes(serviceId)) return undefined
  if (constraints?.allowServiceIds && constraints.allowServiceIds.length > 0 && !constraints.allowServiceIds.includes(serviceId)) {
    return undefined
  }
  const family = project.cloud?.cloudFamily || 'public'
  if (service.availability && service.availability[family] === false) return undefined
  return service
}

const servicesWithReason = (services: SelectedService[], reason: string): string[] =>
  services
    .filter((service) => Array.isArray(service.requiredBy) && service.requiredBy.includes(reason))
    .map((service) => service.id)

const applyWafAutomation = ({
  services,
  autoSet,
  project
}: {
  services: SelectedService[]
  autoSet: Set<string>
  project: Project
}) => {
  const profile = project.profile as ProjectProfile | undefined
  const baselineEnabled = profile?.useWafBaseline !== false
  const dynamicEnabled = !!profile?.wafAdaptiveAdditions
  const answers = extractNfrAnswers(project.nfrAssessment)
  const context: WafRuleContext = { cloudFamily: project.cloud?.cloudFamily || 'public' }

  let servicesClone: SelectedService[] | null = null
  let autoClone: Set<string> | null = null
  let changed = false
  let autoChanged = false
  const addedNames: string[] = []
  const removedNames: string[] = []

  const ensureServicesClone = () => {
    if (!servicesClone) {
      servicesClone = services.map((svc) => ({
        ...svc,
        requiredBy: Array.isArray(svc.requiredBy) ? [...svc.requiredBy] : []
      }))
    }
    return servicesClone
  }

  const ensureAutoClone = () => {
    if (!autoClone) {
      autoClone = new Set(autoSet)
    }
    return autoClone
  }

  const ensureService = (serviceId: string, reason: string, candidateOverride?: AzureService) => {
    const candidate = candidateOverride || getAutoIncludeCandidate(serviceId, project)
    if (!candidate) return
    const currentList = servicesClone || services
    const index = currentList.findIndex((svc) => svc.id === serviceId)
    if (index === -1) {
      const list = ensureServicesClone()
      const newService: SelectedService = {
        ...candidate,
        isAutoIncluded: true,
        addedAt: new Date(),
        requiredBy: [reason]
      }
      list.push(newService)
      ensureAutoClone().add(serviceId)
      addedNames.push(candidate.name)
      autoChanged = true
      changed = true
    } else {
      const existing = currentList[index]
      const requiredBy = Array.isArray(existing.requiredBy) ? existing.requiredBy : []
      if (!requiredBy.includes(reason)) {
        const list = ensureServicesClone()
        const updatedRequiredBy = [...requiredBy, reason]
        list[index] = {
          ...list[index],
          requiredBy: updatedRequiredBy
        }
        changed = true
      }
    }
  }

  const dropReason = (serviceId: string, reason: string) => {
    const baseline = servicesClone || services
    const index = baseline.findIndex((svc) => svc.id === serviceId)
    if (index === -1) return
    const list = ensureServicesClone()
    const service = list[index]
    const requiredBy = Array.isArray(service.requiredBy) ? service.requiredBy : []
    if (!requiredBy.includes(reason)) return
    const filtered = requiredBy.filter((r) => r !== reason)
    if (service.isAutoIncluded && filtered.length === 0) {
      list.splice(index, 1)
      const autoSetMutable = ensureAutoClone()
      if (autoSetMutable.delete(serviceId)) {
        autoChanged = true
      }
      removedNames.push(service.name)
      changed = true
    } else {
      list[index] = {
        ...service,
        requiredBy: filtered
      }
      changed = true
    }
  }

  if (baselineEnabled) {
    WAF_BASELINE_SERVICES.forEach(({ serviceId }) => {
      const candidate = getAutoIncludeCandidate(serviceId, project)
      if (candidate) {
        ensureService(serviceId, WAF_BASELINE_REASON, candidate)
      } else {
        dropReason(serviceId, WAF_BASELINE_REASON)
      }
    })
  } else {
    const current = servicesWithReason(services, WAF_BASELINE_REASON)
    current.forEach((serviceId) => dropReason(serviceId, WAF_BASELINE_REASON))
  }

  WAF_DYNAMIC_RULES.forEach((rule) => {
    const currentList = servicesClone || services
    const tagged = servicesWithReason(currentList, rule.reason)
    if (!dynamicEnabled) {
      tagged.forEach((serviceId) => dropReason(serviceId, rule.reason))
      return
    }

    const resolvedIds = rule.getServices(answers.get(rule.questionId), context)
    const desiredIds: string[] = []
    resolvedIds.forEach((serviceId) => {
      const candidate = getAutoIncludeCandidate(serviceId, project)
      if (candidate) {
        ensureService(serviceId, rule.reason, candidate)
        desiredIds.push(serviceId)
      } else {
        dropReason(serviceId, rule.reason)
      }
    })
    const desiredSet = new Set(desiredIds)
    tagged.forEach((serviceId) => {
      if (!desiredSet.has(serviceId)) {
        dropReason(serviceId, rule.reason)
      }
    })
  })

  const resultServices = changed ? (servicesClone || services) : services
  const resultAuto = autoChanged && autoClone ? autoClone : autoSet

  return {
    services: resultServices,
    autoSet: resultAuto,
    added: addedNames,
    removed: removedNames,
    changed: changed || autoChanged
  }
}

const setsEqual = (a: Set<string>, b: Set<string>) => {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}

const ArchitectureCanvas: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [autoIncludedServices, setAutoIncludedServices] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' }[]>([])
  const [detailsService, setDetailsService] = useState<AzureService | null>(null)
  const { currentProject, setArchitecture } = useProject()

  const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString()
    const payload = { id, message, type } as const
    setNotifications(prev => [...prev, payload])
    try { window.dispatchEvent(new CustomEvent('arch-message', { detail: payload })) } catch {}
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }, [])

  // Root drop: accept any service and route to its category
  const [{ isOver: isOverRoot }, rootDrop] = useDrop(() => ({
    accept: 'azure-service',
    drop: (item: AzureService, monitor) => {
      if (monitor.didDrop()) return
      handleServiceDrop(item)
    },
    collect: (m) => ({ isOver: m.isOver({ shallow: true }) }),
  }))

  const handleServiceDrop = useCallback((service: AzureService) => {
    // Check if service already exists
    if (selectedServices.find(s => s.id === service.id)) {
      addNotification(`${service.name} is already in your architecture`, 'warning')
      return
    }

    // Check for conflicts
    const conflicts = selectedServices.filter(existing => 
      existing.conflictsWith.includes(service.id) || 
      service.conflictsWith.includes(existing.id)
    )

    if (conflicts.length > 0) {
      addNotification(`${service.name} conflicts with: ${conflicts.map(c => c.name).join(', ')}`, 'warning')
      return
    }

    // Get required dependencies
    const requiredDeps: SelectedService[] = []
    const newAutoIncluded = new Set(autoIncludedServices)

    service.requiredDependencies.forEach(depId => {
      if (!selectedServices.find(s => s.id === depId)) {
        const depService = getServiceById(depId)
        if (depService) {
          requiredDeps.push({
            ...depService,
            isAutoIncluded: true,
            addedAt: new Date(),
            requiredBy: [service.id]
          })
          newAutoIncluded.add(depId)
        }
      }
    })

    // Add main service
    const newService: SelectedService = {
      ...service,
      isAutoIncluded: false,
      addedAt: new Date(),
      requiredBy: []
    }

    setSelectedServices(prev => {
      const next = [...prev, newService, ...requiredDeps]
      const seen = new Set<string>()
      return next.filter(s => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
    })
    setAutoIncludedServices(newAutoIncluded)
    
    // Notifications
    addNotification(`Added ${service.name} to your architecture`, 'success')
    if (requiredDeps.length > 0) {
      addNotification(
        `Auto-included ${requiredDeps.length} required dependencies: ${requiredDeps.map(d => d.name).join(', ')}`, 
        'info'
      )
    }

    // Suggest optional dependencies
    if (service.optionalDependencies.length > 0) {
      const availableOptional = service.optionalDependencies
        .filter(depId => !selectedServices.find(s => s.id === depId))
        .map(depId => getServiceById(depId))
        .filter(Boolean) as AzureService[]
      
      if (availableOptional.length > 0) {
        addNotification(
          `Consider adding: ${availableOptional.slice(0, 2).map(d => d.name).join(', ')}${availableOptional.length > 2 ? '...' : ''}`,
          'info'
        )
      }
    }
  }, [selectedServices, autoIncludedServices])

  const removeService = useCallback((serviceId: string) => {
    const service = selectedServices.find(s => s.id === serviceId)
    if (!service) return

    // Check if other services depend on this one
    const dependents = selectedServices.filter(s => 
      s.requiredDependencies.includes(serviceId)
    )

    if (dependents.length > 0 && !service.isAutoIncluded) {
      addNotification(
        `Cannot remove ${service.name} - required by: ${dependents.map(d => d.name).join(', ')}`,
        'warning'
      )
      return
    }

    // Remove service and update auto-included set
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId))
    setAutoIncludedServices(prev => {
      const newSet = new Set(prev)
      newSet.delete(serviceId)
      return newSet
    })
    
    addNotification(`Removed ${service.name} from architecture`, 'info')
  }, [selectedServices])

  // Grouping by role was replaced by category-based sections

  const calculateEstimatedCost = () => estimateMonthlyCost(selectedServices, currentProject || undefined)

  const clearArchitecture = () => {
    setSelectedServices([])
    setAutoIncludedServices(new Set())
    addNotification('Architecture cleared', 'info')
  }

  const onInfo = (service: AzureService) => setDetailsService(service)
  const onRemoveChip = (service: AzureService) => removeService(service.id)

  // Group by category for compact sectioned layout
  const servicesByCategory = useMemo(() => {
    const groups: Record<string, AzureService[]> = {}
    selectedServices.forEach(s => {
      if (!groups[s.category]) groups[s.category] = []
      if (!groups[s.category].some(x => x.id === s.id)) {
        groups[s.category].push(s)
      }
    })
    return groups
  }, [selectedServices])

  useEffect(() => {
    try {
      const ids = selectedServices.map(s => s.id)
      window.dispatchEvent(new CustomEvent('arch-services-changed', { detail: { ids } }))
    } catch {}
  }, [selectedServices])

  useEffect(() => {
    if (!currentProject) return
    const result = applyWafAutomation({
      services: selectedServices,
      autoSet: autoIncludedServices,
      project: currentProject
    })

    if (!result.changed) return

    if (result.services !== selectedServices) {
      setSelectedServices(result.services)
    }

    if (!setsEqual(autoIncludedServices, result.autoSet)) {
      setAutoIncludedServices(result.autoSet)
    }

    if (result.added.length > 0) {
      addNotification(`WAF automation added: ${result.added.join(', ')}`, 'info')
    }
    if (result.removed.length > 0) {
      addNotification(`WAF automation removed: ${result.removed.join(', ')}`, 'info')
    }
  }, [currentProject, selectedServices, autoIncludedServices, addNotification])

  // Persist to project when selection changes
  useEffect(() => {
    if (!currentProject) return
    const existing = currentProject.architecture?.items || []
    // Avoid overwriting a non-empty saved architecture with an initial empty render
    if (selectedServices.length === 0 && existing.length > 0) return
    const arch: ProjectArchitectureState = {
      items: selectedServices.map(s => ({ id: s.id, isAutoIncluded: s.isAutoIncluded })),
      lastSaved: new Date().toISOString(),
      overrides: currentProject.architecture?.overrides || {}
    }
    setArchitecture(arch)
  }, [selectedServices, currentProject?.id])

  // Rehydrate from project on mount/change
  useEffect(() => {
    if (!currentProject?.architecture || !Array.isArray(currentProject.architecture.items) || currentProject.architecture.items.length === 0) {
      setSelectedServices([])
      setAutoIncludedServices(new Set())
      return
    }
    const items = currentProject.architecture.items
    const rebuilt: SelectedService[] = []
    const auto = new Set<string>()
    items.forEach(({ id, isAutoIncluded }) => {
      const base = getServiceById(id)
      if (base) {
        rebuilt.push({ ...base, isAutoIncluded: Boolean(isAutoIncluded), addedAt: new Date(), requiredBy: [] })
        if (isAutoIncluded) auto.add(id)
      }
    })
    // ensure unique ids when rehydrating
    const seenIds = new Set<string>()
    const unique = rebuilt.filter(s => {
      if (seenIds.has(s.id)) return false
      seenIds.add(s.id)
      return true
    })
    setSelectedServices(unique)
    setAutoIncludedServices(auto)
  }, [currentProject?.id])

  const categoryLabel = (category: string) => {
    switch (category) {
      case 'compute': return 'Compute'
      case 'databases': return 'Databases'
      case 'object-storage': return 'Object & File Storage'
      case 'analytics': return 'Analytics & Warehousing'
      case 'integration': return 'Integration & API'
      case 'networking': return 'Networking'
      case 'security': return 'Security'
      case 'monitoring': return 'Monitoring'
      case 'identity': return 'Identity'
      case 'messaging': return 'Messaging & Caching'
      default: return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  // (Rack view manifest meta derivation removed)

  // Listen for external clear command from page header
  useEffect(() => {
    const handler = () => clearArchitecture()
    window.addEventListener('arch-clear', handler)
    return () => window.removeEventListener('arch-clear', handler)
  }, [])

  // Listen for external add-service command from page suggestions
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const id = (e as CustomEvent).detail?.id as string | undefined
        if (!id) return
        const svc = getServiceById(id)
        if (svc) handleServiceDrop(svc)
      } catch {}
    }
    window.addEventListener('arch-add-service', handler as EventListener)
    return () => window.removeEventListener('arch-add-service', handler as EventListener)
  }, [handleServiceDrop])

  // Alignment and suggestions are shown in the outer header

  return (
    <div className="space-y-4">
      {/* Drop Zone (container wraps category lanes) */}
      <div
        ref={rootDrop}
        className={`drop-zone min-h-48 rounded-lg transition-all duration-200 border ${
          isOverRoot
            ? 'border-azure-blue-500 bg-azure-blue-50 dark:bg-azure-blue-900/30'
            : 'border-architect-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900'
        }`}
      >
        <div className="space-y-4 p-4">
          {Object.keys(azureServiceCatalog).map((catKey) => {
            const list = servicesByCategory[catKey] || []
            return (
              <CategoryDropLane
                key={catKey}
                categoryId={catKey}
                title={categoryLabel(catKey)}
                services={list}
                onDropService={handleServiceDrop}
                onInfo={onInfo}
                onRemove={onRemoveChip}
              />
            )
          })}
          {selectedServices.length === 0 && (
            <div className="text-center text-xs text-architect-gray-500 dark:text-gray-400">
              Drag a service by its top bar and drop into a matching section.
            </div>
          )}
        </div>
      </div>
      <DetailsDrawer service={detailsService} onClose={() => setDetailsService(null)} />
    </div>
  )
}

const CategoryDropLane: React.FC<{
  categoryId: string
  title: string
  services: AzureService[]
  onDropService: (s: AzureService) => void
  onInfo: (s: AzureService) => void
  onRemove: (s: AzureService) => void
}> = ({ categoryId, title, services, onDropService, onInfo, onRemove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'azure-service',
    canDrop: (item: AzureService) => item.category === categoryId,
    drop: (item: AzureService, monitor) => {
      if (monitor.canDrop()) onDropService(item)
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  })

  return (
    <div
      ref={drop}
      className={`rounded-lg p-3 min-h-[84px] border transition ${
        isOver && canDrop
          ? 'border-azure-blue-500 bg-azure-blue-50 dark:bg-azure-blue-900/30 shadow-inner'
          : 'border-architect-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold tracking-wide text-architect-gray-900 dark:text-gray-100">{title}</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-architect-gray-100 text-architect-gray-600 dark:bg-gray-800 dark:text-gray-300">{services.length}</span>
      </div>
      {services.length > 0 ? (
        <div className="space-y-1">
          {services.map(s => (
            <ServiceCard key={s.id} service={s} onInfo={onInfo} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <div className={`text-xs text-center py-6 rounded ${
          canDrop ? 'text-azure-blue-700 dark:text-azure-blue-300' : 'text-architect-gray-500 dark:text-gray-400'
        }`}>
          {canDrop ? `Drop ${title} services here` : `No ${title} yet`}
        </div>
      )}
    </div>
  )
}

// Legacy ServiceGroup removed in favor of compact category sections

// Legacy ServiceNode removed in favor of ServiceChip in ArchitectureSection

export default ArchitectureCanvas
