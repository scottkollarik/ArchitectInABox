import React, { useState } from 'react'

const APIDevelopmentPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Unified bordered strip that joins the active tab */}
      <div className="col-span-12">
        <div className="border border-azure-blue-300 rounded-lg shadow-sm overflow-hidden">
          {/* Strip header */}
          <div className="bg-azure-blue-50 px-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-base md:text-lg font-semibold text-azure-blue-900">
                API Development
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white"
                >
                  {showPanel ? 'Hide Planning' : 'Show Planning'}
                </button>
              </div>
            </div>
          </div>
          {/* Top content panel */}
          {showPanel && (
            <div className="bg-white">
              <div className="pt-4 pb-5 px-5 text-sm text-architect-gray-700">
                <p className="mb-2">
                  Define API surfaces, versioning strategy, and non-functional requirements that impact API design (idempotency, pagination, rate limits).
                </p>
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

      {/* Placeholder main area for API design tools */}
      <div className="col-span-12">
        <div className="bg-white rounded-lg shadow-lg border border-architect-gray-200 p-6 text-architect-gray-600 text-sm">
          API design workspace coming next.
        </div>
      </div>
    </div>
  )
}

export default APIDevelopmentPage
