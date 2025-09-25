import React, { useState } from 'react'
import { InformationCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { AzureService } from '../../types'

const badge = (tier: string) => {
  switch (tier) {
    case 'PaaS':
      return 'badge-paas text-[10px] px-1.5 py-0.5'
    case 'IaaS':
      return 'badge-iaas text-[10px] px-1.5 py-0.5'
    case 'SaaS':
      return 'badge-saas text-[10px] px-1.5 py-0.5'
    default:
      return 'badge-service-tier text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
  }
}

const ServiceCard: React.FC<{
  service: AzureService
  onInfo?: (s: AzureService) => void
  onRemove?: (s: AzureService) => void
}> = ({ service, onInfo, onRemove }) => {
  const [hover, setHover] = useState(false)
  return (
    <div
      className={`border border-architect-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-900 shadow-sm transition-colors ${
        hover ? 'ring-1 ring-azure-blue-200 dark:ring-azure-blue-500/60' : ''
      }`}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-architect-gray-900 dark:text-gray-100 truncate">{service.name}</div>
            <span className={`${badge(service.tier)} rounded-full`}>{service.tier}</span>
          </div>
          <p className="mt-1 text-xs text-architect-gray-600 dark:text-gray-400">
            {service.description}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-80">
          {onInfo && (
            <button className="p-1 text-architect-gray-400 dark:text-gray-500 hover:text-architect-gray-700 dark:hover:text-gray-300" title="Details" onClick={() => onInfo(service)}>
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400/80" title="Remove" onClick={() => onRemove(service)}>
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between text-xs">
        <span className="text-architect-gray-500 dark:text-gray-400 truncate pr-3">
          {service.pricing.unit}
        </span>
        <span className="text-green-600 dark:text-green-400 font-medium">
          {service.pricing.estimate}
        </span>
      </div>
    </div>
  )
}

export default ServiceCard
