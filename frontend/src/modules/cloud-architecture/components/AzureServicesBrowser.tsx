import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { azureServiceCatalog } from '../data/azureServices'
import type { AzureService } from '../types'

const AzureServicesBrowser: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['compute', 'storage']) // Start with compute and storage expanded
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Filter services based on search and tier
  const filterServices = (services: AzureService[]) => {
    return services.filter(service => {
      const matchesSearch = searchTerm === '' || 
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesTier = selectedTier === 'all' || service.tier === selectedTier

      return matchesSearch && matchesTier
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-architect-gray-400" />
          <input
            type="text"
            placeholder="Search Azure services..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            className="select-field text-sm"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
          >
            <option value="all">All Service Types</option>
            <option value="IaaS">IaaS Only</option>
            <option value="PaaS">PaaS Only</option>
            <option value="SaaS">SaaS Only</option>
          </select>
          
          <button
            onClick={() => {
              setExpandedCategories(new Set(Object.keys(azureServiceCatalog)))
            }}
            className="text-sm text-azure-blue-600 hover:text-azure-blue-800"
          >
            Expand All
          </button>
          
          <button
            onClick={() => setExpandedCategories(new Set())}
            className="text-sm text-architect-gray-600 hover:text-architect-gray-800"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Service Categories */}
      <div className="space-y-3">
        {Object.entries(azureServiceCatalog).map(([categoryId, category]) => {
          const filteredServices = filterServices(category.services)
          const isExpanded = expandedCategories.has(categoryId)
          
          // Hide category if no services match filter
          if (filteredServices.length === 0 && (searchTerm || selectedTier !== 'all')) {
            return null
          }
          
          return (
            <div key={categoryId} className="border border-architect-gray-200 rounded-lg bg-white shadow-sm">
              {/* Category Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-architect-gray-50 transition-colors duration-200"
                onClick={() => toggleCategory(categoryId)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-semibold text-architect-gray-900">{category.name}</h3>
                    <p className="text-sm text-architect-gray-600">{category.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-architect-gray-500 bg-architect-gray-100 px-2 py-1 rounded-full">
                    {filteredServices.length} services
                  </span>
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-architect-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-architect-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Category Services */}
              {isExpanded && (
                <div className="border-t border-architect-gray-200 bg-architect-gray-50 p-4">
                  <div className="grid gap-3">
                    {filteredServices.map((service) => (
                      <DraggableServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Help Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <TagIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Service Browser Tips:</p>
            <ul className="text-xs space-y-1 list-disc list-inside ml-2">
              <li>Drag services to the architecture canvas to add them</li>
              <li>Required dependencies will be automatically included</li>
              <li>Service tiers: IaaS (Infrastructure), PaaS (Platform), SaaS (Software)</li>
              <li>Search by name, description, or tags to find specific services</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

const DraggableServiceCard: React.FC<{ service: AzureService }> = ({ service }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'azure-service',
    item: service,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case 'IaaS': return 'badge-iaas'
      case 'PaaS': return 'badge-paas'  
      case 'SaaS': return 'badge-saas'
      default: return 'badge-service-tier bg-gray-100 text-gray-800'
    }
  }

  const getArchitectureRoleColor = (role: string) => {
    switch (role) {
      case 'core': return 'text-green-600'
      case 'supporting': return 'text-blue-600'
      case 'optional': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div
      ref={drag}
      className={`service-node drag-item ${isDragging ? 'opacity-50 rotate-2' : 'opacity-100'}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Service Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-semibold text-sm text-architect-gray-900 truncate">
              {service.name}
            </h4>
            <span className={getTierBadgeClass(service.tier)}>
              {service.tier}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className={`font-medium ${getArchitectureRoleColor(service.architectureRole)}`}>
              {service.architectureRole}
            </span>
            {service.tags && service.tags.length > 0 && (
              <span className="text-architect-gray-500">
                • {service.tags.slice(0, 2).join(', ')}
                {service.tags.length > 2 && ` +${service.tags.length - 2}`}
              </span>
            )}
          </div>
        </div>
        
        {/* Drag Handle */}
        <div className="text-architect-gray-400 ml-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      </div>

      {/* Service Description */}
      <p className="text-xs text-architect-gray-600 mb-3 line-clamp-2">
        {service.description}
      </p>

      {/* Service Metadata */}
      <div className="space-y-2">
        {/* Pricing Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1 text-green-600">
            <CurrencyDollarIcon className="w-3 h-3" />
            <span className="font-medium">{service.pricing.estimate}</span>
          </div>
          <span className="text-architect-gray-500">{service.pricing.unit}</span>
        </div>

        {/* Dependencies Warning */}
        {service.requiredDependencies.length > 0 && (
          <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
            <span>Requires {service.requiredDependencies.length} dependencies</span>
          </div>
        )}

        {/* Optional Dependencies */}
        {service.optionalDependencies.length > 0 && (
          <div className="text-xs text-blue-600">
            <span className="font-medium">Often paired with:</span>{' '}
            <span className="text-blue-500">
              {service.optionalDependencies.length} services
            </span>
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="mt-3 pt-2 border-t border-architect-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center justify-between text-xs">
          <button
            className="text-azure-blue-600 hover:text-azure-blue-800 font-medium"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Open service details modal
            }}
          >
            View Details
          </button>
          <button
            className="text-architect-gray-600 hover:text-architect-gray-800"
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Open pricing calculator
            }}
          >
            Calculate Cost
          </button>
        </div>
      </div>
    </div>
  )
}

export default AzureServicesBrowser