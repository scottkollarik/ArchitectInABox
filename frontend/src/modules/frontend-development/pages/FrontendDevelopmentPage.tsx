import React, { useState } from 'react'

const FrontendDevelopmentPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Joined strip container */}
      <div className="col-span-12">
        <div className="border border-azure-blue-300 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-azure-blue-50 px-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-base md:text-lg font-semibold text-azure-blue-900">Frontend Development</div>
              <div className="ml-auto">
                <button onClick={() => setShowPanel(!showPanel)} className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white">
                  {showPanel ? 'Hide Planning' : 'Show Planning'}
                </button>
              </div>
            </div>
          </div>
          {showPanel && (
            <div className="bg-white">
              <div className="pt-4 pb-5 px-5 text-sm text-architect-gray-700">
                <ul className="list-disc ml-5 space-y-1">
                  <li>Framework/SSR choice, routing, auth shell</li>
                  <li>Design system + accessibility baseline</li>
                  <li>Perf budgets (TTI/LCP/CLS), asset strategy</li>
                  <li>Env config, feature flags, telemetry hooks</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12">
        <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200 p-6 text-architect-gray-600 text-sm">
          Frontend workspace coming next.
        </div>
      </div>
    </div>
  )
}

export default FrontendDevelopmentPage
