import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useDrop } from 'react-dnd'
import { CurrencyDollarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import type { AzureService, SelectedService, ProjectArchitectureState } from '../types'
import { getServiceById, azureServiceCatalog } from '../data/azureServices'
import { useProject } from '../../../context/ProjectContext'
import ArchitectureSection from './architecture/ArchitectureSection'
import DetailsDrawer from './architecture/DetailsDrawer'

const ArchitectureCanvas: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [autoIncludedServices, setAutoIncludedServices] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' }[]>([])
  const [detailsService, setDetailsService] = useState<AzureService | null>(null)
  const { currentProject, setArchitecture } = useProject()

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  // Drop handling is per-category via CategoryDropLane

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

    setSelectedServices(prev => [...prev, newService, ...requiredDeps])
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
      groups[s.category].push(s)
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
    setSelectedServices(rebuilt)
    setAutoIncludedServices(auto)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id])

  const categoryLabel = (category: string) => {
    switch (category) {
      case 'compute': return 'Compute'
      case 'databases': return 'Databases'
      case 'object-storage': return 'Object & File Storage'
      case 'networking': return 'Networking'
      case 'security': return 'Security'
      case 'monitoring': return 'Monitoring'
      case 'identity': return 'Identity'
      case 'messaging': return 'Messaging & Caching'
      default: return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  // Update quick stats in the parent component
  useEffect(() => {
    const servicesCountEl = document.getElementById('services-count')
    const estimatedCostEl = document.getElementById('estimated-cost')
    
    if (servicesCountEl) {
      servicesCountEl.textContent = selectedServices.length.toString()
    }
    
    if (estimatedCostEl) {
      const cost = calculateEstimatedCost()
      estimatedCostEl.textContent = cost > 0 ? `$${cost.toFixed(0)}/month` : '$0'
    }
  }, [selectedServices])

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div 
              key={notification.id}
              className={`text-xs p-2 rounded animate-fade-in ${
                notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                notification.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone (container wraps category lanes) */}
      <div className="drop-zone min-h-48 p-4 rounded-lg transition-all duration-200 border-architect-gray-300 bg-white">
        {selectedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-16 h-16 rounded-full bg-architect-gray-100 flex items-center justify-center mb-3">
              <ArrowPathIcon className="w-8 h-8 text-architect-gray-400" />
            </div>
            <p className="text-sm font-medium text-architect-gray-600 mb-1">Drop Azure services into the matching sections below</p>
            <p className="text-xs text-architect-gray-500">Dependencies will be automatically included</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Architecture Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-architect-gray-200">
              <h3 className="font-semibold text-architect-gray-900">
                Architecture ({selectedServices.length} services)
              </h3>
              <button
                onClick={clearArchitecture}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>

            {/* Sectioned by Category (compact chips) with drop lanes */}
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
            </div>

            {/* Cost Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">Estimated Monthly Cost</span>
                </div>
                <span className="font-bold text-green-800">
                  ${calculateEstimatedCost().toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                *Rough estimate based on basic tiers. Use Azure calculator for precise pricing.
              </p>
            </div>
          </div>
        )}
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
    <div ref={drop} className={`rounded-lg p-3 border ${isOver && canDrop ? 'border-azure-blue-300 bg-azure-blue-25' : 'border-architect-gray-200 bg-white'}`}>
      <ArchitectureSection title={title} services={services} onInfo={onInfo} onRemove={onRemove} />
      {services.length === 0 && (
        <p className="text-xs text-architect-gray-500">Drop {title} services here</p>
      )}
    </div>
  )
}

// Legacy ServiceGroup removed in favor of compact category sections

// Legacy ServiceNode removed in favor of ServiceChip in ArchitectureSection

export default ArchitectureCanvas
