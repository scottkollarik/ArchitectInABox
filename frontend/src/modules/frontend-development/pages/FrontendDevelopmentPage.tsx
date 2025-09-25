import React, { useState } from 'react'

const FrontendDevelopmentPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Joined strip container */}
      <div className="col-span-12">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Frontend Development</div>
              <div className="ml-auto">
                <button onClick={() => setShowPanel(!showPanel)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700">
                  {showPanel ? 'Hide Planning' : 'Show Planning'}
                </button>
              </div>
            </div>
          </div>
          {showPanel && (
            <div className="bg-white dark:bg-gray-800">
              <div className="pt-4 pb-5 px-5 text-sm text-architect-gray-700 dark:text-gray-300">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700 p-6 text-architect-gray-600 dark:text-gray-300 text-sm">
          Frontend workspace coming next.
        </div>
      </div>
    </div>
  )
}

export default FrontendDevelopmentPage
