import React from 'react'
import ServiceChip from './ServiceChip'
import type { AzureService } from '../../types'

export interface ArchitectureSectionProps {
  title: string
  services: AzureService[]
  onInfo?: (service: AzureService) => void
  onRemove?: (service: AzureService) => void
  collapsible?: boolean
}

const ArchitectureSection: React.FC<ArchitectureSectionProps> = ({
  title,
  services,
  onInfo,
  onRemove,
  collapsible = true,
}) => {
  const [open, setOpen] = React.useState(true)
  const count = services.length

  if (count === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-architect-gray-800">{title}</h4>
          <span className="text-xs text-architect-gray-500">({count})</span>
        </div>
        {collapsible && (
          <button className="text-xs text-architect-gray-600" onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <ServiceChip key={s.id} service={s} onInfo={onInfo} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  )}

export default ArchitectureSection

