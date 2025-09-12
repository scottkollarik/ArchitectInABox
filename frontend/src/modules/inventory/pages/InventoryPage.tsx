import React, { useEffect, useMemo, useState } from 'react'
import { useProject } from '../../../context/ProjectContext'
import { azureServiceCatalog } from '../../cloud-architecture/data/azureServices'

const InventoryPage: React.FC = () => {
  const { currentProject, setArchitecture } = useProject()
  const [showPanel, setShowPanel] = useState(true)
  const items = currentProject?.architecture?.items || []
  const overrides = currentProject?.architecture?.overrides || {}
  const lastSaved = currentProject?.architecture?.lastSaved
  const serviceById = useMemo(() => {
    const map: Record<string, { id: string; name: string; category: string }> = {}
    Object.values(azureServiceCatalog).forEach(cat => {
      cat.services.forEach(svc => { map[svc.id] = { id: svc.id, name: svc.name, category: svc.category } })
    })
    return map
  }, [])
  const dataItems = items.filter(it => {
    const svc = serviceById[it.id]
    return svc && (svc.category === 'databases' || svc.category === 'object-storage')
  })
  const dbItems = dataItems.filter(it => serviceById[it.id]?.category === 'databases')
  const osItems = dataItems.filter(it => serviceById[it.id]?.category === 'object-storage')

  // Session-only demo seed: ensure 4 ghost items (SQL, Cosmos DB, Blob, Files)
  useEffect(() => {
    if (!currentProject) return
    try {
      const key = 'inventory-demo-seed'
      const existing = currentProject.architecture?.items?.length || 0
      if (existing > 0 || sessionStorage.getItem(key)) return
      const seedIds = ['azure-sql-hyperscale', 'cosmos-db', 'blob-storage', 'azure-files']
      const items = seedIds.map(id => ({ id })) as any
      setArchitecture({ items, lastSaved: new Date().toISOString() })
      sessionStorage.setItem(key, '1')
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id])

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        {/* Unified bordered strip that joins the active tab */}
        <div className="border border-azure-blue-300 rounded-lg rounded-tl-none shadow-sm overflow-hidden">
          {/* Strip header */}
          <div className="bg-azure-blue-50 px-4 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-base md:text-lg font-semibold text-azure-blue-900">Inventory</div>
              <div className="ml-auto">
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white"
                >
                  {showPanel ? 'Hide Overview' : 'Show Overview'}
                </button>
              </div>
            </div>
          </div>
          {/* Top content panel */}
          {showPanel && (
            <div className="bg-white">
              <div className="pt-4 pb-5 px-5 text-sm text-architect-gray-700">
                <p className="mb-2">Inventory reflects your current architecture selections and will surface live telemetry once securely connected.</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Snapshot of services from <span className="font-medium">Your Architecture</span> grouped by category.</li>
                  <li>Items start as <span className="inline-block px-2 py-0.5 rounded bg-architect-gray-100">ghost</span>; provisioning + secure keys enable metrics.</li>
                  <li>Planned: filters, search, and export; quick stats (health, latency, errors, storage, RU/s).</li>
                </ul>
              </div>
            </div>
          )}

          <div className="bg-white p-4">
            {!currentProject ? (
              <div className="text-architect-gray-600 text-sm">No project loaded.</div>
            ) : (
              <>
                <div className="mb-4 grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-architect-gray-500">Project</div>
                    <div className="font-medium text-architect-gray-900">{currentProject.name}</div>
                  </div>
                  <div>
                    <div className="text-architect-gray-500">Cloud Family</div>
                    <div className="font-medium text-architect-gray-900">{currentProject.cloud?.cloudFamily || '—'}</div>
                  </div>
                  <div>
                    <div className="text-architect-gray-500">Regions</div>
                    <div className="font-medium text-architect-gray-900">{currentProject.cloud?.primaryRegionId || '—'}{currentProject.cloud?.secondaryRegionId ? ` → ${currentProject.cloud?.secondaryRegionId}` : ''}</div>
                  </div>
                </div>

                <div className="mb-3 p-3 border border-architect-gray-200 rounded bg-architect-gray-50">
                  <div className="text-sm font-semibold text-architect-gray-900 mb-1">About Inventory</div>
                  <ul className="list-disc ml-5 text-xs text-architect-gray-700 space-y-1">
                    <li>Shows a live snapshot of services in <span className="font-medium">Your Architecture</span>.</li>
                    <li>Items appear as <span className="inline-block px-2 py-0.5 rounded bg-architect-gray-100">ghost</span> until provisioned and securely connected.</li>
                    <li>Once connected, cards will display quick stats (health, latency, errors, storage, RU/s) from observability.</li>
                  </ul>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Databases */}
                  <div className="border border-architect-gray-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-architect-gray-200 text-sm font-semibold">Databases</div>
                    <div className="p-3 space-y-2">
                      {dbItems.length === 0 ? (
                        <div className="text-sm text-architect-gray-600">No Databases yet. Add Azure SQL or Cosmos DB in Your Architecture.</div>
                      ) : (
                        dbItems.map((it, idx) => {
                          const svc = serviceById[it.id]
                          const ov = overrides?.[it.id]
                          return (
                            <div key={idx} className="border border-architect-gray-200 rounded p-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-architect-gray-900 text-sm">{svc?.name || it.id}</div>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-architect-gray-100">ghost</span>
                              </div>
                              <div className="text-xs text-architect-gray-500 mt-1">{ov?.size ? `Size: ${ov.size}` : 'Size: —'} · Last update: {lastSaved ? new Date(lastSaved).toLocaleDateString() : '—'}</div>
                              <div className="text-[11px] text-architect-gray-500 mt-1">Telemetry: not connected</div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  {/* Object & File Storage */}
                  <div className="border border-architect-gray-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-architect-gray-200 text-sm font-semibold">Object & File Storage</div>
                    <div className="p-3 space-y-2">
                      {osItems.length === 0 ? (
                        <div className="text-sm text-architect-gray-600">No Object & File Storage yet. Add Blob Storage in Your Architecture.</div>
                      ) : (
                        osItems.map((it, idx) => {
                          const svc = serviceById[it.id]
                          const ov = overrides?.[it.id]
                          return (
                            <div key={idx} className="border border-architect-gray-200 rounded p-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-architect-gray-900 text-sm">{svc?.name || it.id}</div>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-architect-gray-100">ghost</span>
                              </div>
                              <div className="text-xs text-architect-gray-500 mt-1">{ov?.size ? `Size: ${ov.size}` : 'Size: —'} · Last update: {lastSaved ? new Date(lastSaved).toLocaleDateString() : '—'}</div>
                              <div className="text-[11px] text-architect-gray-500 mt-1">Telemetry: not connected</div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryPage
