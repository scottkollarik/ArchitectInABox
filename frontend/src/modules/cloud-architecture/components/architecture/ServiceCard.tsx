import React, { useState } from 'react'
import { InformationCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { AzureService } from '../../types'

const badge = (tier: string) => tier === 'PaaS' ? 'bg-green-100 text-green-700' : tier === 'IaaS' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'

const ServiceCard: React.FC<{
  service: AzureService
  onInfo?: (s: AzureService) => void
  onRemove?: (s: AzureService) => void
}> = ({ service, onInfo, onRemove }) => {
  const [hover, setHover] = useState(false)
  return (
    <div className={`border rounded-md p-2 bg-white shadow-sm ${hover ? 'ring-1 ring-azure-blue-200' : ''}`}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-architect-gray-900 truncate">{service.name}</div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge(service.tier)}`}>{service.tier}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-architect-gray-600 truncate">{service.description}</p>
            <span className="text-xs text-green-600 font-medium ml-2">{service.pricing.estimate}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-80">
          {onInfo && (
            <button className="p-1 text-architect-gray-400 hover:text-architect-gray-700" title="Details" onClick={() => onInfo(service)}>
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button className="p-1 text-red-400 hover:text-red-600" title="Remove" onClick={() => onRemove(service)}>
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServiceCard

