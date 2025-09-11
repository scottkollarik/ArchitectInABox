import React, { useMemo, useState, useCallback } from 'react'
import type { Manifest, ModuleNode, ModuleParams } from '../../graph/manifest'
import Inspector from './Inspector'
import { useProject } from '../../../../context/ProjectContext'
import { sizingMatrix } from '../../data/sizingMatrix'
import type { SizingLevel, ProjectArchitectureState } from '../../types'

interface RackViewProps {
  manifest: Manifest
}

// Simple 2D rack using CSS grid and SVG cables (no external deps)
const categoriesOrder = ['compute', 'databases', 'object-storage', 'networking', 'security', 'messaging', 'monitoring', 'identity']

const RackView: React.FC<RackViewProps> = ({ manifest }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [paramEdits, setParamEdits] = useState<Record<string, ModuleParams>>({})
  const { currentProject, updateProject } = useProject()

  const selectedModule: ModuleNode | null = selectedId ? manifest.modules.find(m => m.id === selectedId) || null : null
  const selectedParams: ModuleParams | undefined = selectedId ? (paramEdits[selectedId] || manifest.modules.find(m => m.id === selectedId)?.params) : undefined
  const profileSize: SizingLevel = (currentProject?.profile?.size as SizingLevel) || 'M'
  const overrides = currentProject?.architecture?.overrides || {}
  const overrideFor = selectedId ? overrides[selectedId] : undefined
  // effective size is override or inherited profile size

  const persistOverride = useCallback(async (serviceId: string, override?: { size?: SizingLevel; params?: Record<string, any> }) => {
    const arch: ProjectArchitectureState = currentProject?.architecture || { items: [], lastSaved: new Date().toISOString(), overrides: {} }
    const nextOverrides = { ...(arch.overrides || {}) } as Record<string, { size?: SizingLevel; params?: Record<string, any> }>
    if (!override || (override.size === undefined && (!override.params || Object.keys(override.params).length === 0))) {
      delete nextOverrides[serviceId]
    } else {
      nextOverrides[serviceId] = { ...(nextOverrides[serviceId] || {}), ...override }
    }
    await updateProject({ architecture: { ...arch, overrides: nextOverrides, lastSaved: new Date().toISOString() } as any })
  }, [currentProject, updateProject])

  const toggleCollapse = useCallback((cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }, [])

  // Position modules by category column and index row
  const layout = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    const colWidth = 240
    const rowHeight = 90
    categoriesOrder.forEach((cat, col) => {
      const nodes = manifest.modules.filter((m) => m.category === cat)
      nodes.forEach((m, idx) => {
        if (!collapsed.has(cat)) {
          positions[m.id] = { x: col * colWidth + 24, y: idx * rowHeight + 24 }
        }
      })
    })
    return positions
  }, [manifest.modules, collapsed])

  const width = Math.max(900, categoriesOrder.length * 240)
  const height = Math.max(600, (manifest.modules.length + 1) * 90)

  return (
    <div className="relative">
      {/* Columns */}
      {/* If secondary region present, show two racks horizontally */}
      <div className="grid" style={{ gridTemplateColumns: manifest.meta?.secondaryRegionId ? `repeat(${categoriesOrder.length * 2}, 240px)` : `repeat(${categoriesOrder.length}, 240px)`, gap: '8px' }}>
        {categoriesOrder.map((cat) => {
          const nodes = manifest.modules.filter((m) => m.category === cat)
          const isCollapsed = collapsed.has(cat)
          return (
            <div key={cat} className="p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-architect-gray-700 capitalize">{label(cat)} {manifest.meta?.primaryRegionId ? <span className="text-architect-gray-400">(Primary)</span> : null}</div>
                <button className="text-[11px] text-architect-gray-600" onClick={() => toggleCollapse(cat)}>
                  {isCollapsed ? `Show (${nodes.length})` : `Hide (${nodes.length})`}
                </button>
              </div>
              {!isCollapsed && (
                <div className="space-y-2">
                  {nodes.map((m) => {
                    const params = paramEdits[m.id] || m.params
                    const selected = selectedId === m.id
                    return (
                      <div
                        key={m.id}
                        className={`bg-white border rounded p-2 shadow-sm cursor-pointer ${selected ? 'border-azure-blue-400 ring-1 ring-azure-blue-200' : 'border-architect-gray-200'}`}
                        onMouseEnter={() => setHoverId(m.id)}
                        onMouseLeave={() => setHoverId(prev => (prev === m.id ? null : prev))}
                        onClick={() => setSelectedId(m.id)}
                      >
                        <div className="text-sm font-medium text-architect-gray-900 truncate">{m.name}</div>
                        {params?.sku && (
                          <div className="text-xs text-architect-gray-500">{params.sku}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {manifest.meta?.secondaryRegionId && categoriesOrder.map((cat) => {
          const nodes = manifest.modules.filter((m) => m.category === cat)
          const isCollapsed = collapsed.has(`${cat}-secondary`)
          return (
            <div key={`${cat}-secondary`} className="p-2 opacity-80">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-architect-gray-700 capitalize">{label(cat)} <span className="text-architect-gray-400">(Secondary)</span></div>
                <button className="text-[11px] text-architect-gray-600" onClick={() => toggleCollapse(`${cat}-secondary`)}>
                  {isCollapsed ? `Show (${nodes.length})` : `Hide (${nodes.length})`}
                </button>
              </div>
              {!isCollapsed && (
                <div className="space-y-2">
                  {nodes.map((m) => {
                    const params = paramEdits[m.id] || m.params
                    return (
                      <div key={`${m.id}-secondary`} className="bg-white border border-architect-gray-200 rounded p-2 shadow-sm">
                        <div className="text-sm font-medium text-architect-gray-900 truncate">{m.name} <span className="text-[10px] text-architect-gray-500">DR</span></div>
                        {params?.sku && (
                          <div className="text-xs text-architect-gray-500">{params.sku}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cables */}
      <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
        {manifest.cables.map((e) => {
          const from = layout[e.from.moduleId]
          const to = layout[e.to.moduleId]
          if (!from || !to) return null
          const x1 = from.x + 200
          const y1 = from.y + 30
          const x2 = to.x + 20
          const y2 = to.y + 30
          const mid = (x1 + x2) / 2
          const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
          const active = selectedId && (e.from.moduleId === selectedId || e.to.moduleId === selectedId)
          const hover = hoverId && (e.from.moduleId === hoverId || e.to.moduleId === hoverId)
          return (
            <path
              key={e.id}
              d={path}
              stroke={strokeFor(e.type)}
              strokeWidth={active ? 3 : hover ? 2.5 : 2}
              fill="none"
              opacity={active ? 0.95 : hover ? 0.8 : 0.45}
            />
          )
        })}
        {/* Labels */}
        {manifest.cables.map((e) => {
          const from = layout[e.from.moduleId]
          const to = layout[e.to.moduleId]
          if (!from || !to || !e.label) return null
          const x1 = from.x + 200
          const y1 = from.y + 30
          const x2 = to.x + 20
          const y2 = to.y + 30
          const midx = (x1 + x2) / 2
          const midy = (y1 + y2) / 2
          return (
            <text key={`${e.id}-label`} x={midx} y={midy - 6} fontSize={10} fill="#64748b" textAnchor="middle">
              {e.label}
            </text>
          )
        })}
      </svg>

      {/* Inspector */}
      <Inspector
        module={selectedModule}
        params={selectedParams}
        onChange={(p) => {
          if (!selectedId) return
          setParamEdits(prev => ({ ...prev, [selectedId]: p }))
          // Persist params into overrides (Custom if edited)
          persistOverride(selectedId, { size: overrideFor?.size || 'Custom', params: p })
        }}
        onClose={() => setSelectedId(null)}
      />

      {/* Size override & Advanced */}
      {selectedModule && (
        <div className="absolute bottom-0 right-0 w-full max-w-sm bg-white border-t border-architect-gray-200 p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-architect-gray-700">Size</div>
            <div className="text-architect-gray-500">Inherited: {profileSize}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-architect-gray-600">Override</label>
            <select
              value={overrideFor?.size || ''}
              onChange={(e) => {
                const val = e.target.value as SizingLevel | ''
                if (!selectedId) return
                if (val === '') {
                  // remove override
                  persistOverride(selectedId, undefined)
                } else {
                  persistOverride(selectedId, { size: val })
                }
              }}
              className="px-2 py-1 border border-architect-gray-300 rounded"
            >
              <option value="">(Inherited)</option>
              {(['XS','S','M','L','XL','Custom'] as SizingLevel[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Advanced for this size */}
          <details className="mt-2">
            <summary className="cursor-pointer text-architect-gray-700">Advanced for {overrideFor?.size || profileSize}</summary>
            <div className="mt-2 space-y-1 text-architect-gray-700">
              {renderSizingSuggestions(selectedModule.id, overrideFor?.size || profileSize)}
              <div className="mt-2 flex gap-2">
                <button
                  className="px-2 py-1 border border-architect-gray-300 rounded"
                  onClick={() => {
                    if (!selectedId) return
                    const sugg = getSuggestions(selectedModule.id, overrideFor?.size || profileSize)
                    if (sugg) persistOverride(selectedId, { size: overrideFor?.size || profileSize, params: sugg })
                  }}
                >
                  Apply Suggested
                </button>
                <button
                  className="px-2 py-1 border border-architect-gray-300 rounded"
                  onClick={() => {
                    if (!selectedId) return
                    persistOverride(selectedId, { size: overrideFor?.size || profileSize, params: {} })
                  }}
                >
                  Reset Params
                </button>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function getSuggestions(serviceId: string, size: SizingLevel): Record<string, any> | undefined {
  const svc = sizingMatrix[serviceId]
  return svc ? svc[size] : undefined
}

function renderSizingSuggestions(serviceId: string, size: SizingLevel) {
  const sugg = getSuggestions(serviceId, size)
  if (!sugg || Object.keys(sugg).length === 0) {
    return <div className="text-xs text-architect-gray-500">No suggested parameters for this size.</div>
  }
  return (
    <div className="text-xs">
      {Object.entries(sugg).map(([k, v]) => (
        <div key={k} className="flex justify-between"><span className="text-architect-gray-500">{k}</span><span className="text-architect-gray-800">{String(v)}</span></div>
      ))}
    </div>
  )
}


function label(category: string) {
  switch (category) {
    case 'compute': return 'Compute'
    case 'databases': return 'Databases'
    case 'object-storage': return 'Object & File Storage'
    case 'networking': return 'Networking'
    case 'security': return 'Security'
    case 'messaging': return 'Messaging & Caching'
    case 'monitoring': return 'Monitoring'
    case 'identity': return 'Identity'
    default: return category
  }
}

function strokeFor(type: string) {
  switch (type) {
    case 'http': return '#2563eb' // blue
    case 'events': return '#f59e0b' // amber
    case 'data': return '#10b981' // emerald
    case 'identity': return '#7c3aed' // purple
    case 'telemetry': return '#14b8a6' // teal
    case 'control': return '#6b7280' // gray
    default: return '#9ca3af'
  }
}

export default RackView
