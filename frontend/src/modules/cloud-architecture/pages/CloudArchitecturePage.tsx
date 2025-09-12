import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NFRAssessmentForm from '../components/NFRAssessmentForm'
import AzureServicesBrowser from '../components/AzureServicesBrowser'
import ArchitectureCanvas from '../components/ArchitectureCanvas'
import { useProject } from '../../../context/ProjectContext'
import { getSectionCompletion, nfrSections } from '../data/nfrData'
import type { NFRSection } from '../types'
import { generateRecommendations, getServiceById } from '../data/azureServices'
import { ChevronDownIcon, ChevronRightIcon, CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline'
import AlignmentReportDrawer from '../components/AlignmentReportDrawer'

const CloudArchitecturePage: React.FC = () => {
  const [showNfr, setShowNfr] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showMessages, setShowMessages] = useState(true)
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
  const selectedIds = useMemo(() => new Set(
    (currentProject?.architecture?.items || []).map(it => it.id)
  ), [currentProject?.architecture?.items])

  const servicesCount = selectedIds.size

  const estimatedMonthlyCost = useMemo(() => {
    let total = 0
    selectedIds.forEach(id => {
      const svc = getServiceById(id)
      if (svc) {
        const costString = svc.pricing.estimate.replace(/[^0-9.]/g, '')
        const cost = parseFloat(costString) || 0
        total += cost
      }
    })
    return total
  }, [selectedIds])

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
      networkPosture: find('network-posture')
    } as any
  }

  const alignment = useMemo(() => {
    try {
      const nfr = summarizeNfr((currentProject as any)?.nfrAssessment as NFRSection[] | undefined)
      const recs = generateRecommendations(nfr) || []
      const matched = recs.filter(s => s && selectedIds.has(s.id))
      const missing = recs.filter(s => s && !selectedIds.has(s.id))
      const pct = recs.length ? Math.round((matched.length / recs.length) * 100) : 100
      return { matched, missing, pct }
    } catch {
      return { matched: [], missing: [], pct: 100 }
    }
  }, [currentProject, selectedIds])

  // Contextual suggestions: optional dependencies of currently selected services not yet added
  const contextualSuggestions = useMemo(() => {
    const ids: string[] = []
    selectedIds.forEach(id => {
      const svc = getServiceById(id)
      if (svc && Array.isArray(svc.optionalDependencies)) {
        svc.optionalDependencies.forEach(dep => { if (!selectedIds.has(dep)) ids.push(dep) })
      }
    })
    // de-duplicate and map to services
    const unique = Array.from(new Set(ids))
    return unique.map(getServiceById).filter(Boolean) as any[]
  }, [selectedIds])

  // Merge NFR-based missing and contextual suggestions (no duplicates)
  const mergedSuggestions = useMemo(() => {
    const byId = new Map<string, any>()
    alignment.missing.forEach((s) => { if (s) byId.set(s.id, s) })
    contextualSuggestions.forEach((s: any) => { if (s && !byId.has(s.id)) byId.set(s.id, s) })
    // Apply constraints
    const cons = currentProject?.constraints
    let list = Array.from(byId.values())
    if (cons?.denyServiceIds?.length) list = list.filter(s => !cons!.denyServiceIds!.includes(s.id))
    if (cons?.allowServiceIds?.length) list = list.filter(s => cons!.allowServiceIds!.includes(s.id))
    return list
  }, [alignment.missing, contextualSuggestions])

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
        <div className="border border-azure-blue-300 rounded-lg rounded-tl-none shadow-sm overflow-hidden">
          {/* Strip header */}
          <div className="bg-azure-blue-50 px-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
            <div
              className="text-base md:text-lg font-semibold text-azure-blue-900"
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
              <button onClick={() => setShowNfr(!showNfr)} className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white">
                {showNfr ? 'Hide Requirements' : 'Show Requirements'}
              </button>
            </div>
          </div>
          {/* Close strip header container */}
          </div>
          {/* NFR content inside the same bordered container */}
          {showNfr && (
            <div className="bg-white">
              <div className="pt-4 pb-5 px-5">
                <NFRAssessmentForm />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout below the strip */}
        {/* Left: Services */}
        <div className="col-span-7 space-y-4">
          <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200">
            <div className="px-4 py-3 border-b border-architect-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-architect-gray-900">Azure Services</h2>
              <span className="text-[11px] text-architect-gray-500">Browse & drag to build</span>
            </div>
            <div className="p-4">
              <AzureServicesBrowser />
            </div>
          </div>
        </div>
        
        {/* Right: Your Architecture (sticky, scrollable) */}
        <div className="col-span-5">
          <div className="sticky top-2">
            <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200">
              <div className="px-4 py-3 border-b border-architect-gray-200">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-semibold tracking-wide text-architect-gray-900 whitespace-nowrap">Your Services</h2>
                  <button
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent('alignment-report-open')) } catch {}
                    }}
                    className="text-[11px] px-2 py-0.5 rounded border border-architect-gray-300 text-architect-gray-700 hover:bg-architect-gray-50"
                    title="View alignment report"
                  >
                    View Report
                  </button>
                  {servicesCount === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 text-architect-gray-700" title="Drag items from the left and drop below">Drop below</span>
                  )}
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <div className="text-xs text-architect-gray-700">{servicesCount} services</div>
                    <div className="hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded border border-architect-gray-300" title="Alignment compares selected services against NFR-based recommendations">
                      <span className={`font-semibold ${alignment.pct === 100 ? 'text-green-700' : alignment.pct >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{alignment.pct}%</span>
                      <span className="text-architect-gray-600">alignment</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-300 text-green-800">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-700" />
                      <span className="font-semibold">${estimatedMonthlyCost.toFixed(0)}</span>
                      <span className="text-green-700">/month</span>
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
                <div className="border-t border-architect-gray-300 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(s => !s)}
                    className="w-full flex items-center gap-2 text-left px-0 py-1.5 text-xs text-architect-gray-800 hover:bg-architect-gray-50"
                  >
                    {showSuggestions ? (
                      <ChevronDownIcon className="w-3.5 h-3.5 text-architect-gray-500" />
                    ) : (
                      <ChevronRightIcon className="w-3.5 h-3.5 text-architect-gray-500" />
                    )}
                    <span className="font-medium">Suggestions</span>
                    {mergedSuggestions.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full border border-azure-blue-300 text-azure-blue-700">{mergedSuggestions.length}</span>
                    )}
                  </button>
                  {showSuggestions && mergedSuggestions.length > 0 && (
                    <div className="pt-1 pb-2">
                      <div className="text-[11px] text-architect-gray-700">
                        {mergedSuggestions.slice(0,4).map((s) => (
                          <span key={s.id} className="inline-flex items-center px-2 py-0.5 border border-azure-blue-300 text-azure-blue-700 rounded-full mr-1 mt-1">
                            {s.name}
                            <button
                              onClick={() => {
                                try { window.dispatchEvent(new CustomEvent('arch-add-service', { detail: { id: s.id } })) } catch {}
                              }}
                              className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-azure-blue-300 text-azure-blue-700 hover:bg-white"
                              title={`Add ${s.name}`}
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {mergedSuggestions.length > 4 && (
                          <span className="text-architect-gray-500 ml-1">+{mergedSuggestions.length - 4} more</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <button
                          onClick={() => {
                            try {
                              const ids = mergedSuggestions.map(s => s.id)
                              window.dispatchEvent(new CustomEvent('services-filter-missing', { detail: { ids } }))
                            } catch {}
                          }}
                          className="text-[11px] px-2 py-0.5 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white"
                          title="Filter the services browser to show these"
                        >
                          Filter missing
                        </button>
                        <span className="text-[10px] text-architect-gray-500">Add any of these to improve alignment.</span>
                      </div>
                    </div>
                  )}
                  {/* Messages/notifications panel */}
                  {messages.length > 0 && (
                    <div className="pt-1 pb-2">
                      <button
                        onClick={() => setShowMessages(v => !v)}
                        className="text-[11px] px-2 py-0.5 rounded border border-architect-gray-300 text-architect-gray-700 hover:bg-architect-gray-50"
                      >
                        {showMessages ? 'Hide Messages' : 'Show Messages'}
                        {!showMessages && (
                          <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-azure-blue-600 text-white align-middle">{messages.length}</span>
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
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
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
