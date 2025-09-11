import React from 'react'
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import type { AzureService } from '../../types'

interface DetailsDrawerProps {
  service: AzureService | null
  onClose: () => void
}

const DetailsDrawer: React.FC<DetailsDrawerProps> = ({ service, onClose }) => {
  const open = Boolean(service)
  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* panel */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-architect-gray-200">
          <h3 className="font-semibold text-architect-gray-900">{service?.name}</h3>
          <button className="p-1 text-architect-gray-500 hover:text-architect-gray-700" onClick={onClose} aria-label="Close details">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          {service && (
            <>
              <p className="text-architect-gray-700">{service.longDescription || service.description}</p>
              <div className="text-architect-gray-600">
                <p><strong>Category:</strong> {service.category}</p>
                <p><strong>Tier:</strong> {service.tier}</p>
                {service.pricing && (
                  <p><strong>Pricing:</strong> {service.pricing.estimate} ({service.pricing.unit})</p>
                )}
                {service.tags && service.tags.length > 0 && (
                  <p><strong>Tags:</strong> {service.tags.join(', ')}</p>
                )}
              </div>
              {service.documentation && (
                <a
                  href={service.documentation}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-azure-blue-600 hover:text-azure-blue-800"
                >
                  View Docs <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DetailsDrawer

