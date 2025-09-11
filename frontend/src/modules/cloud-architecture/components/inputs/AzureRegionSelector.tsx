import React from 'react'
import { azureRegions, getPairedRegion, getRegionById } from '../../data/azureRegions'

type DRStrategy = 'paired' | 'manual' | 'none'

export interface RegionSelectionValue {
  primary?: string
  drStrategy?: DRStrategy
  secondary?: string
  pairedSuggestion?: string
}

interface AzureRegionSelectorProps {
  id: string
  value?: RegionSelectionValue
  onChange: (value: RegionSelectionValue) => void
  className?: string
}

const AzureRegionSelector: React.FC<AzureRegionSelectorProps> = ({ id, value, onChange, className }) => {
  const primary = value?.primary || ''
  const drStrategy: DRStrategy = value?.drStrategy || 'paired'
  const primaryRegion = primary ? getRegionById(primary) : undefined
  const pairedSuggestion = primary ? getPairedRegion(primary) : undefined
  const secondary = drStrategy === 'manual' ? (value?.secondary || '') : (drStrategy === 'paired' ? pairedSuggestion : '')

  const handlePrimary = (regionId: string) => {
    const nextPaired = regionId ? getPairedRegion(regionId) : undefined
    const next: RegionSelectionValue = {
      primary: regionId || undefined,
      drStrategy,
      pairedSuggestion: nextPaired,
      secondary: drStrategy === 'paired' ? nextPaired : (drStrategy === 'manual' ? value?.secondary : undefined)
    }
    onChange(next)
  }

  const handleStrategy = (strategy: DRStrategy) => {
    const next: RegionSelectionValue = {
      primary: primary || undefined,
      drStrategy: strategy,
      pairedSuggestion,
      secondary: strategy === 'paired' ? pairedSuggestion : (strategy === 'manual' ? value?.secondary : undefined)
    }
    onChange(next)
  }

  const handleSecondary = (regionId: string) => {
    onChange({ primary, drStrategy, pairedSuggestion, secondary: regionId || undefined })
  }

  return (
    <div className={className}>
      {/* Sovereign cloud banner */}
      {primaryRegion?.sovereign && (
        <div className="mb-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-2">
          US Government cloud selected. Service availability and DR pairings are constrained within the same cloud family.
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-primary`} className="block text-xs font-medium text-gray-700 mb-1">Primary Region</label>
          <select
            id={`${id}-primary`}
            value={primary}
            onChange={(e) => handlePrimary(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
          >
            <option value="">Select a region...</option>
            {azureRegions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-strategy`} className="block text-xs font-medium text-gray-700 mb-1">DR Strategy</label>
          <select
            id={`${id}-strategy`}
            value={drStrategy}
            onChange={(e) => handleStrategy(e.target.value as DRStrategy)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
          >
            <option value="paired">Use Paired Region</option>
            <option value="manual">Manual Secondary</option>
            <option value="none">No Cross-Region DR</option>
          </select>
        </div>
      </div>

      {/* Secondary region selection or suggestion */}
      {primary && drStrategy !== 'none' && (
        <div className="mt-3">
          {drStrategy === 'paired' ? (
            <div className="text-xs text-architect-gray-700">
              Suggested paired region: <strong>{pairedSuggestion ? azureRegions.find(r => r.id === pairedSuggestion)?.name : 'N/A'}</strong>
              {!pairedSuggestion && <span className="text-architect-gray-500"> (no default pairing found)</span>}
            </div>
          ) : (
            <div>
              <label htmlFor={`${id}-secondary`} className="block text-xs font-medium text-gray-700 mb-1">Secondary Region</label>
              <select
                id={`${id}-secondary`}
                value={secondary || ''}
                onChange={(e) => handleSecondary(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
              >
                <option value="">Select a region...</option>
                {azureRegions
                  .filter(r => r.id !== primary)
                  .filter(r => !primaryRegion || r.cloudFamily === primaryRegion.cloudFamily)
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AzureRegionSelector
