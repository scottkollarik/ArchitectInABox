import React, { useState, useCallback, useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { 
  TrashIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { AzureService, SelectedService } from '../types'
import { getServiceById } from '../data/azureServices'

const ArchitectureCanvas: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [autoIncludedServices, setAutoIncludedServices] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' }[]>([])

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'azure-service',
    drop: (service: AzureService) => {
      handleServiceDrop(service)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

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

  const getServicesByRole = (role: string) => {
    return selectedServices.filter(s => s.architectureRole === role)
  }

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

      {/* Drop Zone */}
      <div
        ref={drop}
        className={`drop-zone min-h-48 p-4 rounded-lg transition-all duration-200 ${
          isOver && canDrop ? 'drag-over' : 
          canDrop ? 'border-azure-blue-200 bg-azure-blue-25' : 
          'border-architect-gray-300 bg-white'
        }`}
      >
        {selectedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-16 h-16 rounded-full bg-architect-gray-100 flex items-center justify-center mb-3">
              <ArrowPathIcon className="w-8 h-8 text-architect-gray-400" />
            </div>
            <p className="text-sm font-medium text-architect-gray-600 mb-1">
              Drop Azure services here
            </p>
            <p className="text-xs text-architect-gray-500">
              Dependencies will be automatically included
            </p>
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

            {/* Core Services */}
            {getServicesByRole('core').length > 0 && (
              <ServiceGroup 
                title="Core Services" 
                services={getServicesByRole('core')}
                icon={<CheckCircleIcon className="w-4 h-4 text-green-600" />}
                onRemove={removeService}
              />
            )}

            {/* Supporting Services */}
            {getServicesByRole('supporting').length > 0 && (
              <ServiceGroup 
                title="Supporting Services" 
                services={getServicesByRole('supporting')}
                icon={<InformationCircleIcon className="w-4 h-4 text-blue-600" />}
                onRemove={removeService}
              />
            )}

            {/* Optional Services */}
            {getServicesByRole('optional').length > 0 && (
              <ServiceGroup 
                title="Optional Services" 
                services={getServicesByRole('optional')}
                icon={<ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />}
                onRemove={removeService}
              />
            )}

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
    </div>
  )
}

const ServiceGroup: React.FC<{
  title: string
  services: SelectedService[]
  icon: React.ReactNode
  onRemove: (serviceId: string) => void
}> = ({ title, services, icon, onRemove }) => {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold text-architect-gray-800">{title}</h4>
        <span className="text-xs text-architect-gray-500">({services.length})</span>
      </div>
      <div className="space-y-1">
        {services.map((service) => (
          <ServiceNode
            key={service.id}
            service={service}
            onRemove={() => onRemove(service.id)}
          />
        ))}
      </div>
    </div>
  )
}

const ServiceNode: React.FC<{
  service: SelectedService
  onRemove: () => void
}> = ({ service, onRemove }) => {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`service-node group ${service.isAutoIncluded ? 'auto-included' : ''}`}>
      {/* Service Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h5 className="text-sm font-medium text-architect-gray-900 truncate">
              {service.name}
            </h5>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              service.tier === 'PaaS' ? 'bg-green-100 text-green-700' :
              service.tier === 'IaaS' ? 'bg-yellow-100 text-yellow-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {service.tier}
            </span>
            {service.isAutoIncluded && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                Auto
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-architect-gray-600 truncate">
              {service.description}
            </p>
            <span className="text-xs text-green-600 font-medium ml-2">
              {service.pricing.estimate}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-architect-gray-400 hover:text-architect-gray-600"
            title="Toggle details"
          >
            <InformationCircleIcon className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
            title="Remove service"
            disabled={service.isAutoIncluded}
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Service Details */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-architect-gray-200 text-xs animate-fade-in">
          <div className="space-y-1 text-architect-gray-600">
            <p><strong>Role:</strong> {service.architectureRole}</p>
            <p><strong>Added:</strong> {service.addedAt.toLocaleTimeString()}</p>
            {service.requiredBy && service.requiredBy.length > 0 && (
              <p><strong>Required by:</strong> {service.requiredBy.length} services</p>
            )}
            {service.tags && service.tags.length > 0 && (
              <p><strong>Tags:</strong> {service.tags.slice(0, 3).join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ArchitectureCanvas