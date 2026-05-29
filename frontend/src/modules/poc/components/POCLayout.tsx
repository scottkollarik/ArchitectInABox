import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePOC } from '../context/POCContext'

type POCLayoutProps = {
  title: string
  variant?: string
  variants?: Array<{ id: string; name: string; route: string }>
  children: React.ReactNode
}

export default function POCLayout({ title, variant, variants, children }: POCLayoutProps) {
  const navigate = useNavigate()
  const { reset } = usePOC()

  return (
    <div className="min-h-screen bg-architect-gray-50 dark:bg-gray-900">
      {/* POC Banner */}
      <div className="bg-purple-600 dark:bg-purple-700 text-white px-4 py-2 border-b border-purple-700 dark:border-purple-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">🧪 POC MODE</span>
            <span className="text-sm text-purple-100">Changes are NOT saved</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Variant Selector */}
            {variants && variants.length > 1 && (
              <select
                value={variant}
                onChange={(e) => {
                  const selected = variants.find(v => v.id === e.target.value)
                  if (selected) navigate(selected.route)
                }}
                className="text-sm px-2 py-1 rounded border border-purple-500 bg-purple-700 text-white"
              >
                {variants.map(v => (
                  <option key={v.id} value={v.id}>
                    Variant {v.id.toUpperCase()}: {v.name}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                if (confirm('Reset all POC data to initial state?')) {
                  reset()
                }
              }}
              className="text-sm px-3 py-1 rounded border border-purple-400 hover:bg-purple-500 transition"
            >
              🔄 Reset State
            </button>

            {/* Back to Production */}
            <button
              onClick={() => navigate('/aib/cloud-architecture')}
              className="text-sm px-3 py-1 rounded bg-white text-purple-700 hover:bg-purple-50 transition font-medium"
            >
              ← Back to Production
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}
