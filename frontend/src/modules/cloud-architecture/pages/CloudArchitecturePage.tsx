import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NFRAssessmentForm from '../components/NFRAssessmentForm'
import AzureServicesBrowser from '../components/AzureServicesBrowser'
import ArchitectureCanvas from '../components/ArchitectureCanvas'
import { useProject } from '../../../context/ProjectContext'
import { getSectionCompletion, nfrSections } from '../data/nfrData'
import type { NFRSection } from '../types'
import { generateRecommendations, getServiceById, getAllServices } from '../data/azureServices'
import { estimateMonthlyCost } from '../utils/costEstimator'
import { ChevronDownIcon, ChevronRightIcon, CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline'
import AlignmentReportDrawer from '../components/AlignmentReportDrawer'

const CloudArchitecturePage: React.FC = () => {
  const [showNfr, setShowNfr] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showMessages, setShowMessages] = useState(false)
  const [messages, setMessages] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'success' }[]>([])
  const [showReport, setShowReport] = useState(false)
  const location = useLocation()
  const { currentProject } = useProject()

  const sections: NFRSection[] = useMemo(() => {
    return (currentProject?.nfrAssessment as NFRSection[] | undefined) || nfrSections
  }, [currentProject])

  const summary = useMemo(() => {
    return sections.map(s => {
      const c = getSectionCompletion(s)
      const pct = Math.round((c.required.completed / (c.required.total || 1)) * 100)
      return { id: s.id, title: s.title, pct, complete: c.isComplete }
    })
  }, [sections])

  const openSection = (sectionId: string) => {
    setShowNfr(true)
    // Notify NFR form to expand specific section
    try {
      window.dispatchEvent(new CustomEvent('nfr-open-section', { detail: { sectionId } }))
      const el = document.getElementById(`nfr-${sectionId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {}
  }

  // No text animation; keep UI stable

  // (Reverted) Removed complex flight animation to stabilize rendering
  // Derived counts, alignment, and cost from project state for header
  const contextSelectedIds = useMemo(() => new Set(
    (currentProject?.architecture?.items || []).map(it => it.id)
  ), [currentProject?.architecture?.items])

  const [liveSelectedIds, setLiveSelectedIds] = useState<Set<string>>(contextSelectedIds)
  const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set())
  const [autoAddState, setAutoAddState] = useState<{ active: boolean; lastIds: string[] }>({ active: false, lastIds: [] })

  useEffect(() => {
    setLiveSelectedIds(new Set(contextSelectedIds))
    setPendingAddIds(new Set())
    setAutoAddState({ active: false, lastIds: [] })
  }, [contextSelectedIds])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { ids?: string[] } | undefined
      if (!detail || !Array.isArray(detail.ids)) return
      const incoming = new Set(detail.ids)
      setLiveSelectedIds(incoming)
      setPendingAddIds(prev => {
        if (prev.size === 0) return prev
        const next = new Set(prev)
        incoming.forEach(id => next.delete(id))
        return next
      })
      setAutoAddState(prev => prev.active ? { active: prev.active, lastIds: prev.lastIds } : prev)
    }
    window.addEventListener('arch-services-changed', handler as EventListener)
    return () => window.removeEventListener('arch-services-changed', handler as EventListener)
  }, [])

  const enqueueAdd = useCallback((ids: string[], auto = false) => {
    if (!ids || ids.length === 0) return
    setPendingAddIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    if (auto) {
      setAutoAddState({ active: true, lastIds: ids })
    }
    ids.forEach(id => {
      try {
        window.dispatchEvent(new CustomEvent('arch-add-service', { detail: { id } }))
      } catch {}
    })
  }, [])

  const servicesCount = liveSelectedIds.size

  const estimatedMonthlyCost = useMemo(() => {
    const services = getAllServices().filter(s => liveSelectedIds.has(s.id))
    return estimateMonthlyCost(services, currentProject || undefined)
  }, [liveSelectedIds, currentProject])

  const summarizeNfr = (sections?: NFRSection[]) => {
    if (!sections) return {}
    const find = (id: string) => {
      for (const s of sections) {
        const q = s.questions.find(q => q.id === id)
        if (q) return (q as any).value
      }
      return undefined
    }
    let dataModel: string | undefined
    const models = find('data-models') as any[] | undefined
    if (Array.isArray(models) && models[0] && models[0]['model-type']) {
      dataModel = String(models[0]['model-type']).includes('Relational') ? 'Relational' :
                  String(models[0]['model-type']).includes('Document') ? 'Document' : undefined
    }
    return {
      serverlessAcceptable: find('serverless-acceptable'),
      platformPreference: find('platform-preference'),
      dataModel,
      readWriteRatio: find('read-write-ratio'),
      latencyTargets: find('latency-targets'),
      networkPosture: find('network-posture'),
      requestTypes: find('request-types')
    } as any
  }

  const alignment = useMemo(() => {
    try {
      const nfrSections = (currentProject as any)?.nfrAssessment as NFRSection[] | undefined
      const nfr = summarizeNfr(nfrSections)
      const recs = generateRecommendations(nfr, {
        sections: nfrSections,
        profile: currentProject?.profile,
        cloud: currentProject?.cloud
      }) || []
      const matched = recs.filter(s => s && liveSelectedIds.has(s.id))
      const missing = recs.filter(s => s && !liveSelectedIds.has(s.id))
      const pct = recs.length ? Math.round((matched.length / recs.length) * 100) : 100
      return { matched, missing, pct }
    } catch {
      return { matched: [], missing: [], pct: 100 }
    }
  }, [currentProject, liveSelectedIds])

  // Contextual suggestions: optional dependencies of currently selected services not yet added
  const contextualSuggestions = useMemo(() => {
    const ids: string[] = []
    liveSelectedIds.forEach(id => {
      const svc = getServiceById(id)
      if (svc && Array.isArray(svc.optionalDependencies)) {
        svc.optionalDependencies.forEach(dep => { if (!liveSelectedIds.has(dep) && !pendingAddIds.has(dep)) ids.push(dep) })
      }
    })
    // de-duplicate and map to services
    const unique = Array.from(new Set(ids))
    return unique.map(getServiceById).filter(Boolean) as any[]
  }, [liveSelectedIds, pendingAddIds])

  // Merge NFR-based missing and contextual suggestions (no duplicates)
  const mergedSuggestions = useMemo(() => {
    const byId = new Map<string, any>()
    alignment.missing.forEach((s) => { if (s) byId.set(s.id, s) })
    contextualSuggestions.forEach((s: any) => { if (s && !byId.has(s.id)) byId.set(s.id, s) })
    // Apply constraints
    const cons = currentProject?.constraints
    const suppressed = new Set<string>()
    liveSelectedIds.forEach(id => suppressed.add(id))
    pendingAddIds.forEach(id => suppressed.add(id))
    let list = Array.from(byId.values()).filter(s => !suppressed.has(s.id))
    if (cons?.denyServiceIds?.length) list = list.filter(s => !cons!.denyServiceIds!.includes(s.id))
    if (cons?.allowServiceIds?.length) list = list.filter(s => cons!.allowServiceIds!.includes(s.id))
    return list
  }, [alignment.missing, contextualSuggestions, liveSelectedIds, pendingAddIds, currentProject?.constraints])

  useEffect(() => {
    if (!autoAddState.active) return
    if (pendingAddIds.size > 0) return
    if (mergedSuggestions.length === 0) {
      setAutoAddState({ active: false, lastIds: [] })
      return
    }
    const nextIds = mergedSuggestions.map(s => s.id)
    const lastSet = new Set(autoAddState.lastIds)
    const isSame = nextIds.length === autoAddState.lastIds.length && nextIds.every(id => lastSet.has(id))
    if (isSame) {
      setAutoAddState({ active: false, lastIds: [] })
      return
    }
    enqueueAdd(nextIds, true)
  }, [autoAddState, pendingAddIds, mergedSuggestions, enqueueAdd])

  // Listen for architecture messages from the canvas and display in header
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; message: string; type: 'info'|'warning'|'success' }
      if (!detail) return
      setMessages(prev => [...prev, detail])
      // auto-expire like the canvas
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== detail.id))
      }, 5000)
    }
    window.addEventListener('arch-message', handler as EventListener)
    return () => window.removeEventListener('arch-message', handler as EventListener)
  }, [])

  // Open the alignment report drawer on request
  useEffect(() => {
    const handler = () => setShowReport(true)
    window.addEventListener('alignment-report-open', handler)
    return () => window.removeEventListener('alignment-report-open', handler)
  }, [])

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Full-width info strip spanning 12 columns */}
      <div className="col-span-12">
        {/* Unified bordered container so the border continues from tab around strip and down to content */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg rounded-tl-none shadow-sm overflow-hidden">
          {/* Strip header */}
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-3 min-w-0">
            <div
              className="text-base md:text-lg font-semibold text-gray-900 dark:text-white"
              id="ca-strip-title"
              style={{ opacity: 1 }}
            >
              Cloud Architecture
            </div>
            <div className="hidden md:flex flex-wrap gap-1">
              {summary.map(s => (
                <button
                  key={s.id}
                  onClick={() => openSection(s.id)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                    s.complete ? 'border-green-300 bg-green-50 text-green-700' : s.pct > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-architect-gray-300 bg-white text-architect-gray-700'
                  }`}
                  title={`NFR: ${s.title}`}
                >
                  NFR: {s.title.split('&')[0].trim()} {s.pct}%
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <button onClick={() => setShowNfr(!showNfr)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700">
                {showNfr ? 'Hide Requirements' : 'Show Requirements'}
              </button>
            </div>
          </div>
          {/* Close strip header container */}
          </div>
          {/* NFR content inside the same bordered container */}
          <div className={`${showNfr ? 'block' : 'hidden'} bg-white dark:bg-gray-800`} aria-hidden={!showNfr}>
            <div className="pt-4 pb-5 px-5">
              <NFRAssessmentForm />
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout below the strip */}
        {/* Left: Services */}
        <div className="col-span-7 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-architect-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-architect-gray-900 dark:text-white">Azure Services</h2>
              <span className="text-[11px] text-architect-gray-500 dark:text-gray-400">Browse & drag to build</span>
            </div>
            <div className="p-4">
              <AzureServicesBrowser />
            </div>
          </div>
        </div>
        
        {/* Right: Your Architecture (sticky, scrollable) */}
        <div className="col-span-5">
          <div className="sticky top-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-architect-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold tracking-wide text-architect-gray-900 dark:text-white whitespace-nowrap">Your Services</h2>
                  <button
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent('alignment-report-open')) } catch {}
                    }}
                    className="text-[11px] px-2 py-0.5 rounded border border-architect-gray-300 dark:border-gray-600 text-architect-gray-700 dark:text-gray-300 hover:bg-architect-gray-50 dark:hover:bg-gray-700"
                    title="View alignment report"
                  >
                    View Report
                  </button>
                  {servicesCount === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 dark:border-gray-600 text-architect-gray-700 dark:text-gray-300 dark:bg-gray-800" title="Drag items from the left and drop below">Drop below</span>
                  )}
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <div className="text-xs text-architect-gray-700 dark:text-gray-300">{servicesCount} services</div>
                    <div className="hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-600 dark:bg-gray-800" title="Alignment compares selected services against NFR-based recommendations">
                      <span className={`font-semibold ${alignment.pct === 100 ? 'text-green-700' : alignment.pct >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{alignment.pct}%</span>
                      <span className="text-architect-gray-600 dark:text-gray-400">alignment</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-300 dark:border-green-600 text-green-800 dark:text-green-300 dark:bg-green-900">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-700 dark:text-green-400" />
                      <span className="font-semibold">${estimatedMonthlyCost.toFixed(0)}</span>
                      <span className="text-green-700 dark:text-green-400">/month</span>
                    </div>
                    <button
                      onClick={() => {
                        try { window.dispatchEvent(new CustomEvent('arch-clear')) } catch {}
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                    {/* Blueprint import moved to Project Settings */}
                  </div>
                </div>
                {/* Suggestions thin panel under header */}
                {mergedSuggestions.length > 0 && (
                  <div className="border-t border-orange-200 mt-2 bg-orange-50/60 rounded-b-lg shadow-sm dark:border-orange-500/40 dark:bg-orange-900/15">
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(s => !s)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-xs text-orange-900 font-medium hover:bg-orange-100/80 dark:text-orange-200 dark:hover:bg-orange-900/30"
                    >
                      {showSuggestions ? (
                        <ChevronDownIcon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-300" />
                      ) : (
                        <ChevronRightIcon className="w-3.5 h-3.5 text-orange-500 dark:text-orange-300" />
                      )}
                      <span>Recommended Resources</span>
                      <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border border-orange-200 bg-white/70 text-orange-700 shadow-sm dark:border-orange-400/70 dark:bg-orange-900/40 dark:text-orange-200">{mergedSuggestions.length}</span>
                    </button>
                    {showSuggestions && (
                      <div className="pt-1 pb-2">
                        <div className="px-2 text-[11px] text-orange-900 dark:text-orange-200">
                          {mergedSuggestions.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center px-2 py-0.5 border border-orange-200 bg-orange-50 text-orange-700 rounded-full mr-1 mt-1 shadow-sm dark:border-orange-500/60 dark:bg-orange-900/30 dark:text-orange-200"
                            >
                              {s.name}
                              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 font-semibold dark:bg-orange-800 dark:text-orange-100">
                                {s.tier}
                              </span>
                              <button
                                onClick={() => {
                                  enqueueAdd([s.id])
                                }}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-orange-300 bg-white/70 text-orange-600 hover:bg-orange-100 dark:border-orange-400/70 dark:bg-orange-900/40 dark:text-orange-200 dark:hover:bg-orange-800/40"
                                title="Add service"
                                aria-label={`Add ${s.name} service`}
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 px-2 flex flex-wrap items-center gap-2 justify-between">
                          <button
                            onClick={() => {
                              try {
                                const ids = mergedSuggestions.map(s => s.id)
                                window.dispatchEvent(new CustomEvent('services-filter-missing', { detail: { ids } }))
                              } catch {}
                            }}
                            className="text-[11px] px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 shadow-sm dark:border-orange-500/60 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-800/30"
                            title="Filter the services browser to show these"
                          >
                            Filter missing
                          </button>
                          <span className="text-[10px] text-orange-700 dark:text-orange-200">Add any of these to improve alignment.</span>
                        </div>
                        <div className="mt-2 px-2 pt-2 border-t border-orange-200 flex justify-end">
                          <button
                            onClick={() => {
                              if (mergedSuggestions.length === 0) return
                              const idsToAdd = mergedSuggestions.map(s => s.id)
                              enqueueAdd(idsToAdd, true)
                            }}
                            className="text-[11px] px-3 py-1 rounded border border-orange-300 bg-gradient-to-r from-orange-200 via-orange-100 to-orange-50 text-orange-800 font-semibold hover:from-orange-300 hover:via-orange-200 hover:to-orange-100 shadow-md dark:border-orange-500/60 dark:from-orange-900/40 dark:via-orange-900/30 dark:to-orange-900/20 dark:text-orange-100 dark:hover:from-orange-800/40 dark:hover:via-orange-800/30 dark:hover:to-orange-800/20"
                            title="Add all suggested services"
                          >
                            Add all recommended services
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Messages/notifications panel */}
                {messages.length > 0 && (
                  <div className="pt-1 pb-2 border-t border-architect-gray-200 mt-2">
                    <button
                      onClick={() => setShowMessages(v => !v)}
                      className="text-[11px] px-2 py-0.5 rounded border border-architect-gray-300 dark:border-gray-600 text-architect-gray-700 dark:text-gray-300 hover:bg-architect-gray-50 dark:hover:bg-gray-700"
                    >
                      {showMessages ? 'Hide Messages' : 'Show Messages'}
                      {!showMessages && (
                        <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-slate-600 dark:bg-slate-500 text-white align-middle">{messages.length}</span>
                      )}
                    </button>
                    {showMessages && (
                      <div className="mt-1 space-y-1">
                        {messages.map(m => (
                          <div key={m.id} className={`text-[11px] px-2 py-1 rounded ${
                            m.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                            m.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {m.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                <ArchitectureCanvas />
              </div>
            </div>
          </div>
      </div>
      {/* Alignment Report Drawer */}
      <AlignmentReportDrawer open={showReport} onClose={()=>setShowReport(false)} />
    </div>
  )
}

export default CloudArchitecturePage
