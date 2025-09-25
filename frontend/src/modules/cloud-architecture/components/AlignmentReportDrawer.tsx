import React, { useMemo, useState } from 'react'
import { useProject } from '../../../context/ProjectContext'
import { generateRecommendations, getServiceById } from '../data/azureServices'
import type { NFRSection } from '../types'

type CostEntry = {
  id: string
  name: string
  category: string
  unit: string
  estimateDisplay: string
  estimateValue: number
  hasNumericEstimate: boolean
  isAutoIncluded: boolean
}

const AlignmentReportDrawer: React.FC<{ open: boolean; onClose: () => void }>=({ open, onClose })=>{
  const { currentProject } = useProject()
  const architectureItems = currentProject?.architecture?.items || []
  const [activeTab, setActiveTab] = useState<'general' | 'cost'>('general')
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
    const scaleBaseline = find('scale-baseline') as any
    const requestTypesRaw = find('request-types') as any
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
    const identityProvider = find('identity-provider')
    const secretsManagement = find('secrets-management')
    const keyManagement = find('key-management')

    return {
      expectedRps,
      trafficPattern,
      avgRps,
      peakRps,
      latencyTargets,
      scaleBaseline,
      requestCharacteristics: (() => {
        if (!requestTypesRaw) return undefined
        if (Array.isArray(requestTypesRaw)) return { selections: requestTypesRaw, notes: '' }
        if (typeof requestTypesRaw === 'object') {
          const selections = Array.isArray(requestTypesRaw.selections) ? requestTypesRaw.selections : []
          const notes = typeof requestTypesRaw.notes === 'string' ? requestTypesRaw.notes : ''
          return { selections, notes }
        }
        if (typeof requestTypesRaw === 'string') return { selections: [], notes: requestTypesRaw }
        return undefined
      })(),
      dataModels,
      readWriteRatio,
      itemSize,
      networkPosture,
      complianceReqs,
      monitoringStack,
      platformPreference,
      serverlessAcceptable,
      monthlyBudget,
      cloud: currentProject?.cloud,
      multiRegion: find('multi-region'),
      identityProvider,
      secretsManagement,
      keyManagement
    } as any
  }

  const costEntries = useMemo<CostEntry[]>(() => {
    return architectureItems
      .map((item) => {
        const service = getServiceById(item.id)
        if (!service) return null
        const estimateDisplay = service.pricing?.estimate ?? '—'
        const numericPortion = estimateDisplay.replace(/[^0-9.]/g, '')
        const parsedValue = parseFloat(numericPortion)
        const hasNumericEstimate = numericPortion.length > 0 && Number.isFinite(parsedValue)

        return {
          id: service.id,
          name: service.name,
          category: service.category,
          unit: service.pricing?.unit ?? '—',
          estimateDisplay,
          estimateValue: hasNumericEstimate ? parsedValue : 0,
          hasNumericEstimate,
          isAutoIncluded: Boolean(item.isAutoIncluded)
        }
      })
      .filter((entry): entry is CostEntry => Boolean(entry))
  }, [architectureItems])

  const sortedCostEntries = useMemo(() => {
    return [...costEntries].sort((a, b) => {
      if (a.isAutoIncluded !== b.isAutoIncluded) {
        return a.isAutoIncluded ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }, [costEntries])

  const costTotals = useMemo(() => {
    let overall = 0
    let auto = 0
    let numericCount = 0
    let autoNumeric = false
    let manualNumeric = false

    costEntries.forEach((entry) => {
      if (!entry.hasNumericEstimate) return
      numericCount += 1
      overall += entry.estimateValue
      if (entry.isAutoIncluded) {
        auto += entry.estimateValue
        autoNumeric = true
      } else {
        manualNumeric = true
      }
    })

    const manual = overall - auto

    return {
      overall,
      auto,
      manual,
      numericCount,
      autoNumeric,
      manualNumeric
    }
  }, [costEntries])

  const entriesMissingNumeric = costEntries.length - costTotals.numericCount
  const hasNumericTotals = costTotals.numericCount > 0

  const formatCurrency = (value: number, enabled: boolean) => {
    if (!enabled) return '—'
    const hasDecimals = !Number.isInteger(value)
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0
    }
    return `$${value.toLocaleString(undefined, options)}`
  }

  const formatCategory = (category: string) => {
    switch (category) {
      case 'compute': return 'Compute'
      case 'databases': return 'Databases'
      case 'object-storage': return 'Object & File Storage'
      case 'analytics': return 'Analytics & Warehousing'
      case 'integration': return 'Integration & API'
      case 'networking': return 'Networking'
      case 'security': return 'Security'
      case 'monitoring': return 'Monitoring'
      case 'identity': return 'Identity'
      case 'messaging': return 'Messaging & Caching'
      default: return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  const tabButtonClasses = (tab: 'general' | 'cost') => (
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab
        ? 'bg-white dark:bg-gray-800 text-architect-gray-900 dark:text-gray-100 shadow'
        : 'text-architect-gray-600 dark:text-gray-300 hover:text-architect-gray-900 dark:hover:text-gray-100'
    }`
  )

  const selectedIds = useMemo(() => new Set(architectureItems.map(it => it.id)), [architectureItems])
  const nfr = summarizeNfr(sections)
  const recs = (generateRecommendations(nfr, {
    sections,
    profile: currentProject?.profile,
    cloud: currentProject?.cloud
  }) || []).filter(Boolean)
  const matched = recs.filter(s => s && selectedIds.has(s.id))
  const missing = recs.filter(s => s && !selectedIds.has(s.id))
  const pct = recs.length ? Math.round((matched.length / recs.length) * 100) : 100

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-950 shadow-2xl border-l border-architect-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-architect-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-architect-gray-500 dark:text-gray-400">Report</div>
            <h3 className="text-lg font-semibold text-architect-gray-900 dark:text-gray-100">Alignment Overview</h3>
          </div>
          <button onClick={onClose} className="text-architect-gray-600 dark:text-gray-400 hover:text-architect-gray-800 dark:hover:text-gray-200 transition-colors">Close</button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-architect-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="inline-flex rounded-md bg-architect-gray-100 dark:bg-gray-900/60 p-0.5">
            <button type="button" className={tabButtonClasses('general')} onClick={() => setActiveTab('general')}>
              General
            </button>
            <button type="button" className={tabButtonClasses('cost')} onClick={() => setActiveTab('cost')}>
              Cost Breakdown
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-architect-gray-50/60 dark:bg-gray-950 p-4 space-y-4">
          {activeTab === 'general' ? (
            <>
              {/* Workload & Traffic */}
              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Workload & Traffic</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700 dark:text-gray-300">
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Expected RPS:</span> {nfr.expectedRps || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Traffic pattern:</span> {nfr.trafficPattern || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Avg/Peak RPS:</span> {(nfr.avgRps || nfr.peakRps) ? `${nfr.avgRps || '—'} / ${nfr.peakRps || '—'}` : '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Latency P95/P99 (ms):</span> {nfr.latencyTargets ? `${nfr.latencyTargets.p95 || '—'} / ${nfr.latencyTargets.p99 || '—'}` : '—'}</div>
                  <div className="col-span-2">
                    <span className="text-architect-gray-500 dark:text-gray-400">Initial scale rules:</span>{' '}
                    {nfr.scaleBaseline ? (() => {
                      const min = nfr.scaleBaseline['min-instances'] || '—'
                      const max = nfr.scaleBaseline['max-instances'] || '—'
                      const signal = nfr.scaleBaseline['scale-signal'] || '—'
                      const threshold = nfr.scaleBaseline['scale-threshold'] || '—'
                      return `${min} min · ${max} max · ${signal}${threshold && threshold !== '—' ? ` @ ${threshold}` : ''}`
                    })() : '—'}
                  </div>
                  <div className="col-span-2">
                    <span className="text-architect-gray-500 dark:text-gray-400">Request semantics:</span>{' '}
                    {(() => {
                      const rc = nfr.requestCharacteristics
                      if (!rc) return '—'
                      const selections = Array.isArray(rc.selections) ? rc.selections.filter(Boolean) : []
                      const notes = typeof rc.notes === 'string' ? rc.notes.trim() : ''
                      const hasSelections = selections.length > 0
                      const hasNotes = notes.length > 0
                      if (!hasSelections && !hasNotes) return '—'
                      return (
                        <span>
                          {hasSelections ? selections.join(', ') : null}
                          {hasNotes ? (
                            <span className="block text-architect-gray-500 dark:text-gray-400 mt-0.5">{notes}</span>
                          ) : null}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Data & Consistency */}
              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Data & Consistency</div>
                <div className="text-[11px] text-architect-gray-700 dark:text-gray-300">
                  {Array.isArray(nfr.dataModels) && nfr.dataModels.length > 0 ? (
                    nfr.dataModels.slice(0,3).map((m: any, idx: number) => (
                      <div key={idx}>• {m.name || 'Data source'} — {m.type || '—'}{m.consistency ? ` · ${m.consistency}` : ''}</div>
                    ))
                  ) : '—'}
                  {Array.isArray(nfr.dataModels) && nfr.dataModels.length > 3 && (
                    <div className="text-architect-gray-500 dark:text-gray-400">+{nfr.dataModels.length - 3} more</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700 dark:text-gray-300 mt-2">
                  <div><span className="text-architect-gray-500 dark:text-gray-400">R/W Ratio:</span> {nfr.readWriteRatio ? `${nfr.readWriteRatio.read || 0}% read / ${nfr.readWriteRatio.write || 0}% write` : '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Item size:</span> {nfr.itemSize ? (() => {
                    const min = nfr.itemSize.min ?? '—'
                    const max = nfr.itemSize.max ?? '—'
                    const minU = nfr.itemSize.minUnit || nfr.itemSize.unit || ''
                    const maxU = nfr.itemSize.maxUnit || nfr.itemSize.unit || ''
                    return `${min}${minU ? ' ' + minU : ''}–${max}${maxU ? ' ' + maxU : ''}`
                  })() : '—'}</div>
                </div>
              </div>

              {/* Security & Compliance */}
              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Security & Compliance</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700 dark:text-gray-300">
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Network posture:</span> {nfr.networkPosture || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Compliance:</span> {Array.isArray(nfr.complianceReqs) && nfr.complianceReqs.length > 0 ? nfr.complianceReqs.join(', ') : '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Identity provider:</span> {nfr.identityProvider || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Secrets management:</span> {nfr.secretsManagement || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Key management:</span> {nfr.keyManagement || '—'}</div>
                </div>
              </div>

              {/* Operations & Observability */}
              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Operations & Observability</div>
                <div className="text-xs text-architect-gray-700 dark:text-gray-300">
                  <span className="text-architect-gray-500 dark:text-gray-400">Monitoring:</span> {nfr.monitoringStack || '—'}
                </div>
              </div>

              {/* Cost & Constraints */}
              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Cost & Constraints</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-architect-gray-700 dark:text-gray-300">
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Platform:</span> {nfr.platformPreference || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Serverless:</span> {nfr.serverlessAcceptable || '—'}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Monthly budget:</span> {nfr.monthlyBudget ? (typeof nfr.monthlyBudget === 'object' ? `${nfr.monthlyBudget.value || '—'} ${nfr.monthlyBudget.unit || ''}` : String(nfr.monthlyBudget)) : '—'}</div>
                </div>
              </div>

              {currentProject?.profile && (
                <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                  <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-1">Well-Architected Automation</div>
                  <div className="space-y-2 text-xs text-architect-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="text-architect-gray-500 dark:text-gray-400">Baseline services</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] border ${currentProject.profile.useWafBaseline !== false ? 'border-green-400 text-green-700 dark:border-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30' : 'border-architect-gray-300 dark:border-gray-700 text-architect-gray-600 dark:text-gray-400 bg-architect-gray-100 dark:bg-gray-800'}`}>
                        {currentProject.profile.useWafBaseline !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-architect-gray-500 dark:text-gray-400">Adaptive additions</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] border ${currentProject.profile.wafAdaptiveAdditions ? 'border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30' : 'border-architect-gray-300 dark:border-gray-700 text-architect-gray-600 dark:text-gray-400 bg-architect-gray-100 dark:bg-gray-800'}`}>
                        {currentProject.profile.wafAdaptiveAdditions ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100">Alignment</div>
                  <div className="text-xs px-2 py-0.5 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-300">{pct}%</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Matched</div>
                    <div className="text-[11px] text-architect-gray-700 dark:text-gray-300">
                      {matched.length === 0 && <div className="text-architect-gray-500 dark:text-gray-400">—</div>}
                      {matched.map(s => (
                        <span key={s.id} className="inline-block px-2 py-0.5 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-full mr-1 mt-1">{s.name}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Missing</div>
                    <div className="text-[11px] text-architect-gray-700 dark:text-gray-300">
                      {missing.length === 0 && <div className="text-architect-gray-500 dark:text-gray-400">—</div>}
                      {missing.map(s => (
                        <span key={s.id} className="inline-block px-2 py-0.5 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded-full mr-1 mt-1">{s.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent('services-filter-missing', { detail: { ids: missing.map(s => s.id) } })) } catch {}
                    }}
                    className="text-xs px-2 py-1 rounded border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-white dark:hover:bg-gray-800"
                  >
                    Filter missing
                  </button>
                  <button
                    onClick={() => {
                      try { missing.forEach(s => window.dispatchEvent(new CustomEvent('arch-add-service', { detail: { id: s.id } }))) } catch {}
                    }}
                    className="text-xs px-2 py-1 rounded border border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 hover:bg-white dark:hover:bg-gray-800"
                  >
                    Add all
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {costEntries.length === 0 ? (
                <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-6 bg-white dark:bg-gray-900/70 text-sm text-architect-gray-600 dark:text-gray-300 text-center">
                  No services selected yet. Build an architecture to see the itemized cost breakdown.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                      <div className="text-[11px] uppercase tracking-wide text-architect-gray-500 dark:text-gray-400">Total Estimate</div>
                      <div className="mt-1 text-lg font-semibold text-architect-gray-900 dark:text-gray-100">{formatCurrency(costTotals.overall, hasNumericTotals)}</div>
                      <div className="text-[11px] text-architect-gray-500 dark:text-gray-400">Based on listed service estimates</div>
                    </div>
                    <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                      <div className="text-[11px] uppercase tracking-wide text-architect-gray-500 dark:text-gray-400">Auto (WAF)</div>
                      <div className="mt-1 text-lg font-semibold text-architect-gray-900 dark:text-gray-100">{formatCurrency(costTotals.auto, costTotals.autoNumeric)}</div>
                      <div className="text-[11px] text-architect-gray-500 dark:text-gray-400">Baseline & adaptive services</div>
                    </div>
                    <div className="border border-architect-gray-200 dark:border-gray-800 rounded p-3 bg-white dark:bg-gray-900/70">
                      <div className="text-[11px] uppercase tracking-wide text-architect-gray-500 dark:text-gray-400">Selected</div>
                      <div className="mt-1 text-lg font-semibold text-architect-gray-900 dark:text-gray-100">{formatCurrency(costTotals.manual, costTotals.manualNumeric)}</div>
                      <div className="text-[11px] text-architect-gray-500 dark:text-gray-400">Manually added services</div>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-architect-gray-200 dark:border-gray-800 rounded">
                    <table className="min-w-full divide-y divide-architect-gray-200 dark:divide-gray-800 text-sm">
                      <thead className="bg-architect-gray-100 dark:bg-gray-900/60 text-architect-gray-600 dark:text-gray-300 uppercase text-xs font-semibold tracking-wide">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left">Service</th>
                          <th scope="col" className="px-3 py-2 text-left">Category</th>
                          <th scope="col" className="px-3 py-2 text-left">Source</th>
                          <th scope="col" className="px-3 py-2 text-left">Unit</th>
                          <th scope="col" className="px-3 py-2 text-right">Estimate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-architect-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900/40">
                        {sortedCostEntries.map(entry => (
                          <tr key={entry.id} className="text-architect-gray-700 dark:text-gray-300">
                            <td className="px-3 py-2 font-medium text-architect-gray-900 dark:text-gray-100">{entry.name}</td>
                            <td className="px-3 py-2 text-xs">{formatCategory(entry.category)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${entry.isAutoIncluded ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-architect-gray-100 text-architect-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                {entry.isAutoIncluded ? 'Auto (WAF)' : 'Selected'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">{entry.unit}</td>
                            <td className="px-3 py-2 text-right font-medium text-architect-gray-900 dark:text-gray-100">
                              {entry.estimateDisplay}
                              {!entry.hasNumericEstimate && (
                                <span className="block text-[10px] text-architect-gray-500 dark:text-gray-400">Excluded from totals</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!hasNumericTotals && (
                    <div className="text-xs border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 rounded p-3">
                      Add pricing estimates to services to populate roll-up totals.
                    </div>
                  )}

                  {entriesMissingNumeric > 0 && costTotals.numericCount > 0 && (
                    <div className="text-xs border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 rounded p-3">
                      {entriesMissingNumeric} service{entriesMissingNumeric === 1 ? ' is' : 's are'} using custom pricing and excluded from totals.
                    </div>
                  )}

                  <div className="text-xs text-architect-gray-500 dark:text-gray-400">
                    Auto totals reflect Well-Architected baseline and adaptive additions; selected totals cover manual choices.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlignmentReportDrawer
