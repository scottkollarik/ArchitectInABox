import React, { useMemo } from 'react'
import { useProject } from '../../../context/ProjectContext'
import { generateRecommendations, getServiceById } from '../data/azureServices'
import type { NFRSection } from '../types'

const AlignmentReportDrawer: React.FC<{ open: boolean; onClose: () => void }>=({ open, onClose })=>{
  const { currentProject } = useProject()
  const sections = (currentProject?.nfrAssessment as NFRSection[] | undefined) || []
  const summarizeNfr = (sections?: NFRSection[]) => {
    if (!sections) return {}
    const find = (id: string) => {
      for (const s of sections) {
        const q = s.questions.find(q => q.id === id)
        if (q) return (q as any).value
      }
      return undefined
    }
    // Workload & Traffic
    const expectedRps = find('expected-rps')
    const trafficPattern = find('traffic-pattern')
    const rpsCompound = find('peak-vs-average') as any
    const avgRps = rpsCompound?.['average-rps'] || ''
    const peakRps = rpsCompound?.['peak-rps'] || ''
    const latencyTargets = find('latency-targets') as any
    // Data & Consistency
    const models = find('data-models') as any[] | undefined
    const dataModels = Array.isArray(models) ? models.map(m => ({ name: m.name, type: m['model-type'], consistency: m.consistency })).filter(Boolean) : []
    const readWriteRatio = find('read-write-ratio') as any
    const itemSize = find('item-size') as any // { min,max,unit }
    // Security & Compliance
    const networkPosture = find('network-posture')
    const complianceReqs = find('compliance-reqs') as string[] | undefined
    // Ops & Observability
    const monitoringStack = find('monitoring-stack')
    // Cost & Constraints
    const platformPreference = find('platform-preference')
    const serverlessAcceptable = find('serverless-acceptable')
    const monthlyBudget = find('monthly-budget') as any // may be { value, unit }

    return {
      expectedRps,
      trafficPattern,
      avgRps,
      peakRps,
      latencyTargets,
      dataModels,
      readWriteRatio,
      itemSize,
      networkPosture,
      complianceReqs,
      monitoringStack,
      platformPreference,
      serverlessAcceptable,
      monthlyBudget,
    } as any
  }

  const selectedIds = useMemo(() => new Set((currentProject?.architecture?.items || []).map(it => it.id)), [currentProject?.architecture?.items])
  const nfr = summarizeNfr(sections)
  const recs = (generateRecommendations(nfr) || []).filter(Boolean)
  const matched = recs.filter(s => s && selectedIds.has(s.id))
  const missing = recs.filter(s => s && !selectedIds.has(s.id))
  const pct = recs.length ? Math.round((matched.length / recs.length) * 100) : 100

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-architect-gray-200 flex flex-col">
        <div className="p-4 border-b border-architect-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-architect-gray-500">Report</div>
            <h3 className="text-lg font-semibold text-architect-gray-900">Alignment Overview</h3>
          </div>
          <button onClick={onClose} className="text-architect-gray-600 hover:text-architect-gray-800">Close</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Workload & Traffic */}
          <div className="border border-architect-gray-200 rounded p-3">
            <div className="text-sm font-semibold text-architect-gray-900 mb-1">Workload & Traffic</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700">
              <div><span className="text-architect-gray-500">Expected RPS:</span> {nfr.expectedRps || '—'}</div>
              <div><span className="text-architect-gray-500">Traffic pattern:</span> {nfr.trafficPattern || '—'}</div>
              <div><span className="text-architect-gray-500">Avg/Peak RPS:</span> {(nfr.avgRps || nfr.peakRps) ? `${nfr.avgRps || '—'} / ${nfr.peakRps || '—'}` : '—'}</div>
              <div><span className="text-architect-gray-500">Latency P95/P99 (ms):</span> {nfr.latencyTargets ? `${nfr.latencyTargets.p95 || '—'} / ${nfr.latencyTargets.p99 || '—'}` : '—'}</div>
            </div>
          </div>

          {/* Data & Consistency */}
          <div className="border border-architect-gray-200 rounded p-3">
            <div className="text-sm font-semibold text-architect-gray-900 mb-1">Data & Consistency</div>
            <div className="text-[11px] text-architect-gray-700">
              {Array.isArray(nfr.dataModels) && nfr.dataModels.length > 0 ? (
                nfr.dataModels.slice(0,3).map((m: any, idx: number) => (
                  <div key={idx}>• {m.name || 'Data source'} — {m.type || '—'}{m.consistency ? ` · ${m.consistency}` : ''}</div>
                ))
              ) : '—'}
              {Array.isArray(nfr.dataModels) && nfr.dataModels.length > 3 && (
                <div className="text-architect-gray-500">+{nfr.dataModels.length - 3} more</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700 mt-2">
              <div><span className="text-architect-gray-500">R/W Ratio:</span> {nfr.readWriteRatio ? `${nfr.readWriteRatio.read || 0}% read / ${nfr.readWriteRatio.write || 0}% write` : '—'}</div>
              <div><span className="text-architect-gray-500">Item size:</span> {nfr.itemSize ? `${nfr.itemSize.min ?? '—'}–${nfr.itemSize.max ?? '—'} ${nfr.itemSize.unit || ''}` : '—'}</div>
            </div>
          </div>

          {/* Security & Compliance */}
          <div className="border border-architect-gray-200 rounded p-3">
            <div className="text-sm font-semibold text-architect-gray-900 mb-1">Security & Compliance</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700">
              <div><span className="text-architect-gray-500">Network posture:</span> {nfr.networkPosture || '—'}</div>
              <div><span className="text-architect-gray-500">Compliance:</span> {Array.isArray(nfr.complianceReqs) && nfr.complianceReqs.length > 0 ? nfr.complianceReqs.join(', ') : '—'}</div>
            </div>
          </div>

          {/* Operations & Observability */}
          <div className="border border-architect-gray-200 rounded p-3">
            <div className="text-sm font-semibold text-architect-gray-900 mb-1">Operations & Observability</div>
            <div className="text-xs text-architect-gray-700">
              <span className="text-architect-gray-500">Monitoring:</span> {nfr.monitoringStack || '—'}
            </div>
          </div>

          {/* Cost & Constraints */}
          <div className="border border-architect-gray-200 rounded p-3">
            <div className="text-sm font-semibold text-architect-gray-900 mb-1">Cost & Constraints</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700">
              <div><span className="text-architect-gray-500">Platform:</span> {nfr.platformPreference || '—'}</div>
              <div><span className="text-architect-gray-500">Serverless:</span> {nfr.serverlessAcceptable || '—'}</div>
              <div><span className="text-architect-gray-500">Monthly budget:</span> {nfr.monthlyBudget ? (typeof nfr.monthlyBudget === 'object' ? `${nfr.monthlyBudget.value || '—'} ${nfr.monthlyBudget.unit || ''}` : String(nfr.monthlyBudget)) : '—'}</div>
            </div>
          </div>

          <div className="border border-architect-gray-200 rounded p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-architect-gray-900">Alignment</div>
              <div className="text-xs px-2 py-0.5 rounded border border-architect-gray-300">{pct}%</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-green-700 mb-1">Matched</div>
                <div className="text-[11px] text-architect-gray-700">
                  {matched.length === 0 && <div className="text-architect-gray-500">—</div>}
                  {matched.map(s => (
                    <span key={s.id} className="inline-block px-2 py-0.5 border border-green-300 text-green-700 rounded-full mr-1 mt-1">{s.name}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-amber-700 mb-1">Missing</div>
                <div className="text-[11px] text-architect-gray-700">
                  {missing.length === 0 && <div className="text-architect-gray-500">—</div>}
                  {missing.map(s => (
                    <span key={s.id} className="inline-block px-2 py-0.5 border border-azure-blue-300 text-azure-blue-700 rounded-full mr-1 mt-1">{s.name}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('services-filter-missing', { detail: { ids: missing.map(s => s.id) } })) } catch {}
                }}
                className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white"
              >
                Filter missing
              </button>
              <button
                onClick={() => {
                  try { missing.forEach(s => window.dispatchEvent(new CustomEvent('arch-add-service', { detail: { id: s.id } }))) } catch {}
                }}
                className="text-xs px-2 py-1 rounded border border-green-300 text-green-800 hover:bg-white"
              >
                Add all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlignmentReportDrawer
