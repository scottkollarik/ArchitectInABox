import React, { useState, useRef, useEffect } from 'react'
import POCLayout from './POCLayout'
import { usePOC } from '../context/POCContext'
import NFRAssessmentForm from '../../cloud-architecture/components/NFRAssessmentForm'
import ArchitectureCanvas from '../../cloud-architecture/components/ArchitectureCanvas'
import AzureServicesBrowser from '../../cloud-architecture/components/AzureServicesBrowser'
import AlignmentReportDrawer from '../../cloud-architecture/components/AlignmentReportDrawer'
import { XMarkIcon, Bars3Icon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

// Drawer width constants
const NFR_DEFAULT_WIDTH = 480
const NFR_MIN_WIDTH = 400
const NFR_MAX_WIDTH = 600

const REPORT_DEFAULT_WIDTH = 520
const REPORT_MIN_WIDTH = 420
const REPORT_MAX_WIDTH = 600

export default function VariantA_UnifiedDrawer() {
  const { project, alignment, cost } = usePOC()

  // NFR drawer state (left side)
  const [nfrDrawerOpen, setNfrDrawerOpen] = useState(true)
  const [nfrDrawerWidth, setNfrDrawerWidth] = useState(NFR_DEFAULT_WIDTH)
  const nfrWidthRef = useRef(nfrDrawerWidth)

  // Report drawer state (right side)
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false)
  const [reportDrawerWidth, setReportDrawerWidth] = useState(REPORT_DEFAULT_WIDTH)
  const reportWidthRef = useRef(reportDrawerWidth)

  // Sync refs with state
  useEffect(() => {
    nfrWidthRef.current = nfrDrawerWidth
  }, [nfrDrawerWidth])

  useEffect(() => {
    reportWidthRef.current = reportDrawerWidth
  }, [reportDrawerWidth])

  // Load NFR drawer width from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('poc-variantA-nfr-width')
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (Number.isFinite(parsed)) {
          setNfrDrawerWidth(Math.min(NFR_MAX_WIDTH, Math.max(NFR_MIN_WIDTH, parsed)))
        }
      }
    } catch {}
  }, [])

  // Load Report drawer width from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('poc-variantA-report-width')
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (Number.isFinite(parsed)) {
          setReportDrawerWidth(Math.min(REPORT_MAX_WIDTH, Math.max(REPORT_MIN_WIDTH, parsed)))
        }
      }
    } catch {}
  }, [])

  // NFR drawer resize handler
  const handleNfrResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = nfrWidthRef.current
    const originalUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const next = Math.min(NFR_MAX_WIDTH, Math.max(NFR_MIN_WIDTH, startWidth + delta))
      nfrWidthRef.current = next
      setNfrDrawerWidth(next)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = originalUserSelect
      try {
        localStorage.setItem('poc-variantA-nfr-width', String(nfrWidthRef.current))
      } catch {}
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Report drawer resize handler
  const handleReportResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = reportWidthRef.current
    const originalUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX
      const next = Math.min(REPORT_MAX_WIDTH, Math.max(REPORT_MIN_WIDTH, startWidth + delta))
      reportWidthRef.current = next
      setReportDrawerWidth(next)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = originalUserSelect
      try {
        localStorage.setItem('poc-variantA-report-width', String(reportWidthRef.current))
      } catch {}
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const alignmentColor = alignment.pct === 100 ? 'text-green-600 dark:text-green-400' :
                         alignment.pct >= 60 ? 'text-amber-600 dark:text-amber-400' :
                         'text-red-600 dark:text-red-400'

  return (
    <POCLayout title="Variant A: Unified Side Drawers">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Project Info */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Cloud Architecture
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {project.name}
                </p>
              </div>

              {/* Right: Metrics & Controls */}
              <div className="flex items-center gap-4">
                {/* Alignment Metric */}
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Alignment:</span>{' '}
                  <span className={`font-semibold ${alignmentColor}`}>
                    {alignment.pct}%
                  </span>
                </div>

                {/* Cost Metric */}
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Cost:</span>{' '}
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    ${cost}/mo
                  </span>
                </div>

                {/* NFR Drawer Toggle */}
                <button
                  onClick={() => setNfrDrawerOpen(!nfrDrawerOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    nfrDrawerOpen
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Toggle NFR Assessment"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>

                {/* Report Drawer Toggle */}
                <button
                  onClick={() => setReportDrawerOpen(!reportDrawerOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    reportDrawerOpen
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Toggle Alignment Report"
                >
                  <ChartBarIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout: 3 columns (NFR | Canvas | Report) */}
        <div className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900">
          {/* LEFT: NFR Assessment Drawer */}
          {nfrDrawerOpen && (
            <div
              className="relative flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              style={{ width: nfrDrawerWidth, minWidth: NFR_MIN_WIDTH, maxWidth: NFR_MAX_WIDTH }}
            >
              {/* Resize Handle (right edge) */}
              <div
                role="presentation"
                onMouseDown={handleNfrResizeStart}
                className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-transparent hover:bg-purple-500/20 transition-colors z-10"
              />

              {/* Drawer Header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    NFR Assessment
                  </h3>
                  <button
                    onClick={() => setNfrDrawerOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Close drawer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content (scrollable) */}
              <div className="flex-1 overflow-y-auto p-4">
                <NFRAssessmentForm />
              </div>
            </div>
          )}

          {/* CENTER: Architecture Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Canvas Container */}
            <div className="flex-1 overflow-hidden flex">
              {/* Services Browser (left half of center) */}
              <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Azure Service Catalog
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag services to the canvas on the right
                  </p>
                </div>
                <AzureServicesBrowser />
              </div>

              {/* Architecture Canvas (right half of center) */}
              <div className="w-1/2 overflow-y-auto p-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Your Architecture
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(project.architecture?.items || []).length} services selected
                  </p>
                </div>
                <ArchitectureCanvas />
              </div>
            </div>
          </div>

          {/* RIGHT: Alignment Report Drawer */}
          {reportDrawerOpen && (
            <div
              className="relative flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
              style={{ width: reportDrawerWidth, minWidth: REPORT_MIN_WIDTH, maxWidth: REPORT_MAX_WIDTH }}
            >
              {/* Resize Handle (left edge) */}
              <div
                role="presentation"
                onMouseDown={handleReportResizeStart}
                className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-transparent hover:bg-purple-500/20 transition-colors z-10"
              />

              {/* Drawer Header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Alignment Report
                  </h3>
                  <button
                    onClick={() => setReportDrawerOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Close drawer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Content (scrollable) */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Alignment Overview */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Alignment Overview
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Overall: {alignment.pct}%
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            alignment.pct === 100 ? 'bg-green-500' :
                            alignment.pct >= 60 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${alignment.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matched Services */}
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                    Matched ({alignment.matched.length})
                  </h4>
                  <div className="space-y-1">
                    {alignment.matched.length === 0 ? (
                      <div className="text-xs text-green-700 dark:text-green-300">
                        No matched services yet
                      </div>
                    ) : (
                      alignment.matched.map((id: string) => (
                        <div key={id} className="text-xs text-green-700 dark:text-green-300">
                          ✓ {id}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Missing Services */}
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Missing ({alignment.missing.length})
                  </h4>
                  <div className="space-y-1">
                    {alignment.missing.length === 0 ? (
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        No missing services
                      </div>
                    ) : (
                      alignment.missing.map((id: string) => (
                        <div key={id} className="text-xs text-amber-700 dark:text-amber-300">
                          ⚠ {id}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Cost Breakdown
                  </h4>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ${cost}/month
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Based on {(project.architecture?.items || []).length} selected services
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </POCLayout>
  )
}
