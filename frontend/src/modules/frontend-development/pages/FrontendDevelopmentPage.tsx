import React, { useState } from 'react'
import { Squares2X2Icon, BoltIcon, PaintBrushIcon, FlagIcon } from '@heroicons/react/24/outline'

const roadmapItems = [
  {
    icon: Squares2X2Icon,
    title: 'Framework Advisor',
    description: 'Get a framework recommendation (React, Vue, Angular, Svelte) based on your team size, SEO needs, and performance targets.',
    status: 'Planned',
  },
  {
    icon: BoltIcon,
    title: 'Performance Budget Planner',
    description: 'Set TTI, LCP, and CLS targets. Map asset strategy, CDN configuration, and lazy-loading approach to your NFR requirements.',
    status: 'Planned',
  },
  {
    icon: PaintBrushIcon,
    title: 'Design System Baseline',
    description: 'Configure accessibility requirements (WCAG level), component library selection, and theming strategy.',
    status: 'Planned',
  },
  {
    icon: FlagIcon,
    title: 'Feature Flag & Telemetry Setup',
    description: 'Wire in Azure App Configuration for feature flags and Application Insights for front-end telemetry.',
    status: 'Planned',
  },
]

const FrontendDevelopmentPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div className="grid grid-cols-12 gap-6">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-architect-gray-200 dark:border-gray-700 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Frontend Workspace</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Advisor tooling for front-end architecture decisions, performance budgets, and design system selection. Coming in v2.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roadmapItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
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

export default FrontendDevelopmentPage
