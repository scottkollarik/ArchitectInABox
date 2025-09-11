import React from 'react'
import type { ModuleNode, ModuleParams } from '../../graph/manifest'

interface InspectorProps {
  module: ModuleNode | null
  params?: ModuleParams
  onChange: (params: ModuleParams) => void
  onClose: () => void
}

const Inspector: React.FC<InspectorProps> = ({ module, params, onChange, onClose }) => {
  const open = Boolean(module)
  if (!open || !module) return null

  const local = params || {}

  return (
    <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-white border-l border-architect-gray-200 shadow-xl z-10">
      <div className="flex items-center justify-between p-3 border-b border-architect-gray-200">
        <div>
          <div className="text-xs text-architect-gray-500">Module</div>
          <div className="text-sm font-semibold text-architect-gray-900 truncate" title={module.name}>{module.name}</div>
        </div>
        <button className="text-architect-gray-500 hover:text-architect-gray-700 text-sm" onClick={onClose}>Close</button>
      </div>
      <div className="p-3 space-y-3 text-sm">
        <div>
          <label className="block text-xs text-architect-gray-600 mb-1">SKU / Tier</label>
          <input
            type="text"
            value={local.sku || ''}
            onChange={(e) => onChange({ ...local, sku: e.target.value })}
            className="w-full px-2 py-1.5 border border-architect-gray-300 rounded"
            placeholder="e.g., Standard S1 / Hyperscale Gen5 / RU Autoscale"
          />
        </div>
        <div>
          <label className="block text-xs text-architect-gray-600 mb-1">Capacity (approx)</label>
          <input
            type="number"
            value={local.capacity ?? ''}
            onChange={(e) => onChange({ ...local, capacity: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-architect-gray-300 rounded"
            placeholder="e.g., replicas, vCores, RU/s"
          />
        </div>
        <div>
          <label className="block text-xs text-architect-gray-600 mb-1">Notes</label>
          <textarea
            value={local.notes || ''}
            onChange={(e) => onChange({ ...local, notes: e.target.value })}
            className="w-full h-24 px-2 py-1.5 border border-architect-gray-300 rounded resize-none"
            placeholder="Assumptions, constraints, rationale"
          />
        </div>
      </div>
    </div>
  )
}

export default Inspector

