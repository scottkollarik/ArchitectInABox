import React from 'react'
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { AzureService } from '../../types'
import { useProject } from '../../../../context/ProjectContext'

export interface ServiceChipProps {
  service: AzureService
  onInfo?: (service: AzureService) => void
  onRemove?: (service: AzureService) => void
}

const tierBadge = (tier: AzureService['tier']) => {
  switch (tier) {
    case 'IaaS': return 'bg-yellow-100 text-yellow-700'
    case 'PaaS': return 'bg-green-100 text-green-700'
    case 'SaaS': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const ServiceChip: React.FC<ServiceChipProps> = ({ service, onInfo, onRemove }) => {
  const { currentProject } = useProject()
  const overrideSize = currentProject?.architecture?.overrides?.[service.id]?.size
  const inheritedSize = (currentProject?.profile?.size as any) || 'M'
  return (
    <div className="inline-flex items-center max-w-full px-2.5 py-1 rounded-md border border-architect-gray-200 bg-white shadow-sm gap-2">
      <span className="text-xs font-medium text-architect-gray-900 truncate" title={service.name}>
        {service.name}
      </span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tierBadge(service.tier)}`}>
        {service.tier}
      </span>
      <span className={`text-[10px] px-1 py-0.5 rounded border ${overrideSize ? 'border-azure-blue-300 text-azure-blue-700' : 'border-architect-gray-300 text-architect-gray-600'}`}
            title={overrideSize ? 'Override size' : 'Inherited size'}>
        {overrideSize || inheritedSize}
      </span>
      {service.icon && (
        <span className="text-xs" aria-hidden>{service.icon}</span>
      )}
      <div className="ml-1 flex items-center gap-1">
        {onInfo && (
          <button
            type="button"
            aria-label={`Details for ${service.name}`}
            className="p-0.5 text-architect-gray-500 hover:text-architect-gray-700"
            onClick={() => onInfo?.(service)}
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${service.name}`}
            className="p-0.5 text-architect-gray-400 hover:text-red-600"
            onClick={() => onRemove?.(service)}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default ServiceChip
