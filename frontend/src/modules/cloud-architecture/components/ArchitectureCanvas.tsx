import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useDrop } from 'react-dnd'
// icons managed in outer header; none used here
import type { AzureService, SelectedService, ProjectArchitectureState } from '../types'
import { getServiceById, azureServiceCatalog } from '../data/azureServices'
import { useProject } from '../../../context/ProjectContext'
// ArchitectureSection no longer used in list view
import ServiceCard from './architecture/ServiceCard'
import DetailsDrawer from './architecture/DetailsDrawer'

const ArchitectureCanvas: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [autoIncludedServices, setAutoIncludedServices] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' }[]>([])
  const [detailsService, setDetailsService] = useState<AzureService | null>(null)
  const { currentProject, setArchitecture } = useProject()

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString()
    const payload = { id, message, type } as const
    setNotifications(prev => [...prev, payload])
    try { window.dispatchEvent(new CustomEvent('arch-message', { detail: payload })) } catch {}
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

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

  const calculateEstimatedCost = () => {
    return selectedServices.reduce((total, service) => {
      // Simple cost calculation - in reality this would be more complex
      const costString = service.pricing.estimate.replace(/[^0-9.]/g, '')
      const cost = parseFloat(costString) || 0
      return total + cost
    }, 0)
  }

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

  // Persist to project when selection changes
  useEffect(() => {
    if (!currentProject) return
    const arch: ProjectArchitectureState = {
      items: selectedServices.map(s => ({ id: s.id, isAutoIncluded: s.isAutoIncluded })),
      lastSaved: new Date().toISOString(),
    }
    setArchitecture(arch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServices, currentProject?.id])

  // Rehydrate from project on mount/change
  useEffect(() => {
    if (!currentProject?.architecture) return
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div ref={rootDrop} className={`drop-zone min-h-48 p-4 rounded-lg transition-all duration-200 ${isOverRoot ? 'border-azure-blue-500 bg-azure-blue-50' : 'border-architect-gray-300 bg-white'} border`}>
        <div className="space-y-4">
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
            <div className="text-center text-xs text-architect-gray-500">Drag a service by its top bar and drop into a matching section.</div>
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
          ? 'border-azure-blue-500 bg-azure-blue-50 shadow-inner'
          : 'border-architect-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold tracking-wide text-architect-gray-900">{title}</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-architect-gray-100 text-architect-gray-600">{services.length}</span>
      </div>
      {services.length > 0 ? (
        <div className="space-y-1">
          {services.map(s => (
            <ServiceCard key={s.id} service={s} onInfo={onInfo} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <div className={`text-xs text-center py-6 rounded ${canDrop ? 'text-azure-blue-700' : 'text-architect-gray-500'}`}>
          {canDrop ? `Drop ${title} services here` : `No ${title} yet`}
        </div>
      )}
    </div>
  )
}

// Legacy ServiceGroup removed in favor of compact category sections

// Legacy ServiceNode removed in favor of ServiceChip in ArchitectureSection

export default ArchitectureCanvas
