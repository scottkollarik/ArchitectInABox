import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import NFRAssessmentForm from '../components/NFRAssessmentForm'
import AzureServicesBrowser from '../components/AzureServicesBrowser'
import ArchitectureCanvas from '../components/ArchitectureCanvas'
import { useProject } from '../../../context/ProjectContext'
import { getSectionCompletion, nfrSections } from '../data/nfrData'
import type { NFRSection } from '../types'

const CloudArchitecturePage: React.FC = () => {
  const [showNfr, setShowNfr] = useState(true)
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
              <div className="px-4 py-3 border-b border-architect-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-architect-gray-900">Your Architecture</h2>
                <span className="text-[11px] text-architect-gray-500">Drop anywhere in this panel</span>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
                <ArchitectureCanvas />
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default CloudArchitecturePage
