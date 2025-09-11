import React, { useRef, useState } from 'react'
import { useDrag } from 'react-dnd'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { azureServiceCatalog, getServiceById } from '../data/azureServices'
import type { AzureService, SizingLevel, ProjectArchitectureState } from '../types'
import { useProject } from '../../../context/ProjectContext'

const AzureServicesBrowser: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['compute', 'storage']) // Start with compute and storage expanded
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const { currentProject, updateProject } = useProject()

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
      const fam = currentProject?.cloud?.cloudFamily || 'public'
      const available = service.availability ? (service.availability as any)[fam] !== false : true

      return matchesSearch && matchesTier && available
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
                      <DraggableServiceCard
                        key={service.id}
                        service={service}
                        size={getEffectiveSize(service.id, currentProject || undefined)}
                        onSizeChange={(sz) => persistOverrideSize(updateProject, currentProject, service.id, sz)}
                        cloudFamily={currentProject?.cloud?.cloudFamily || 'public'}
                      />
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

const DraggableServiceCard: React.FC<{ service: AzureService; size?: SizingLevel | ''; onSizeChange?: (s: SizingLevel | '') => void; cloudFamily: 'public'|'gov' }> = ({ service, size='M', onSizeChange, cloudFamily }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'azure-service',
    item: service,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })
  // Attach drag to bar, preview to whole card so the card moves during drag
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  barRef.current && drag(barRef)
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  cardRef.current && preview(cardRef)

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
      ref={cardRef}
      className={`service-node ${isDragging ? 'opacity-80 shadow-lg scale-[0.99]' : 'opacity-100'} transition`}
      style={{ cursor: 'default' }}
    >
      {/* Drag bar */}
      <div
        ref={barRef}
        className={`h-5 w-full flex items-center justify-center px-2 rounded-t ${barColorFor(service.category)} cursor-grab active:cursor-grabbing`}
        title="Drag to canvas"
      >
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner ml-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-inner" />
        </div>
      </div>
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

        {/* Sizing */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-architect-gray-600">Size</span>
          <select className="border border-architect-gray-300 rounded px-2 py-0.5" value={size} onChange={(e) => onSizeChange?.(e.target.value as SizingLevel | '')}>
            <option value="">(Inherited)</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* Dependencies Warning */}
        {service.requiredDependencies.length > 0 && (
          <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
            <span>Requires {service.requiredDependencies.length} dependencies</span>
          </div>
        )}

        {/* Optional Dependencies (explicit names) */}
        {service.optionalDependencies.length > 0 && (() => {
          const names = service.optionalDependencies
            .map((id) => getServiceById(id)?.name)
            .filter(Boolean) as string[]
          if (names.length === 0) return null
          return (
            <div className="text-xs text-blue-700">
              <span className="font-medium">Often paired with:</span>{' '}
              <span className="text-blue-600">
                {names.slice(0, 3).join(', ')}{names.length > 3 ? `, +${names.length - 3} more` : ''}
              </span>
            </div>
          )
        })()}

        {/* Availability note */}
        {service.availability && service.availability[cloudFamily] === false && (
          <div className="text-xs text-red-600">Not available in this cloud</div>
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

function barColorFor(category: string) {
  switch (category) {
    case 'compute': return 'bg-blue-100'
    case 'databases': return 'bg-green-100'
    case 'object-storage': return 'bg-emerald-100'
    case 'networking': return 'bg-indigo-100'
    case 'security': return 'bg-red-100'
    case 'messaging': return 'bg-orange-100'
    case 'monitoring': return 'bg-purple-100'
    case 'identity': return 'bg-teal-100'
    default: return 'bg-architect-gray-50'
  }
}

// Helpers
function getEffectiveSize(serviceId: string, project?: { profile?: { size?: SizingLevel }, architecture?: ProjectArchitectureState }): SizingLevel | '' {
  const override = project?.architecture?.overrides?.[serviceId]?.size
  return override || ''
}

function persistOverrideSize(updateProject: (u: any)=>Promise<void>, project: any, serviceId: string, size: SizingLevel | '') {
  const arch: ProjectArchitectureState = project?.architecture || { items: [], lastSaved: new Date().toISOString(), overrides: {} }
  const nextOverrides = { ...(arch.overrides || {}) } as Record<string, { size?: SizingLevel; params?: Record<string, any> }>
  if (!size) {
    // remove override to inherit
    delete nextOverrides[serviceId]
  } else {
    nextOverrides[serviceId] = { ...(nextOverrides[serviceId] || {}), size }
  }
  return updateProject({ architecture: { ...arch, overrides: nextOverrides, lastSaved: new Date().toISOString() } })
}

export default AzureServicesBrowser
