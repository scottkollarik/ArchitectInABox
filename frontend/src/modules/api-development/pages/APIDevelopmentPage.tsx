import React, { useState } from 'react'
import { CodeBracketSquareIcon, LockClosedIcon, ScaleIcon, EyeIcon } from '@heroicons/react/24/outline'

const roadmapItems = [
  {
    icon: CodeBracketSquareIcon,
    title: 'API Design Workbench',
    description: 'OpenAPI-first or code-first scaffolding with versioning strategy, pagination conventions, and error contract templates.',
    status: 'Planned',
  },
  {
    icon: LockClosedIcon,
    title: 'AuthN/AuthZ Planner',
    description: 'Configure Entra ID scopes and app roles, service principal flows, and client credential grants for your API surface.',
    status: 'Planned',
  },
  {
    icon: ScaleIcon,
    title: 'Rate Limit & Quota Designer',
    description: 'Define per-client rate limits, burst allowances, and idempotency key strategy — mapped to APIM or custom middleware.',
    status: 'Planned',
  },
  {
    icon: EyeIcon,
    title: 'Observability Template',
    description: 'Structured log schemas, correlation ID propagation, distributed tracing config, and SLO definition per endpoint group.',
    status: 'Planned',
  },
]

const APIDevelopmentPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">API Development</div>
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
                  <li>Spec approach: OpenAPI first vs code-first</li>
                  <li>AuthN/AuthZ: Entra ID, scopes/roles, service principals</li>
                  <li>Rate limits and quotas; cacheability; idempotency keys</li>
                  <li>Observability: request IDs, structured logs, tracing</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Design Workspace</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tooling for API contract design, security configuration, and observability setup. Coming in v2.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roadmapItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{item.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default APIDevelopmentPage
