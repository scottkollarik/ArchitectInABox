import React, { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import AzureRegionSelector from '../modules/cloud-architecture/components/inputs/AzureRegionSelector'
import BlueprintImportButton from '../modules/cloud-architecture/components/BlueprintImportButton'
import { nfrRecipes } from '../modules/cloud-architecture/data/recipes'
import ToggleSwitch from './ToggleSwitch'
import type { ProjectProfile } from '../modules/cloud-architecture/types'

const defaultProfileState: ProjectProfile = {
  level: 'starter',
  size: 'M',
  criticality: 'dev/test',
  useWafBaseline: true,
  wafAdaptiveAdditions: false
}

const ProjectSettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentProject, updateProject, refreshProjects } = useProject()
  const [cloudFamily, setCloudFamily] = useState<'public' | 'gov'>('public')
  const [regionSelection, setRegionSelection] = useState<any>({})
  const [residencyPolicy, setResidencyPolicy] = useState<'no-restriction'|'in-country'|'in-geo'|'custom'>('no-restriction')
  const [residencyCountries, setResidencyCountries] = useState<string[]>([])
  const [profile, setProfile] = useState<ProjectProfile>({ ...defaultProfileState })
  const [recipeId, setRecipeId] = useState<string>('')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)

  // App Log (stored per-project in localStorage)
  type AppLogEntry = { ts: string; type: string; message: string; details?: string }
  const [appLog, setAppLog] = useState<AppLogEntry[]>([])
  const logKey = currentProject ? `architect-app-log:${currentProject.id}` : undefined

  const loadLog = () => {
    if (!logKey) return
    try {
      const raw = localStorage.getItem(logKey)
      setAppLog(raw ? JSON.parse(raw) : [])
    } catch { setAppLog([]) }
  }
  const saveLog = (entries: AppLogEntry[]) => {
    if (!logKey) return
    setAppLog(entries)
    try { localStorage.setItem(logKey, JSON.stringify(entries)) } catch {}
  }
  const addLog = (type: string, message: string, details?: string) => {
    const entry: AppLogEntry = { ts: new Date().toISOString(), type, message, details }
    const next = [entry, ...appLog].slice(0, 500) // cap to 500 entries
    saveLog(next)
  }

  // Seed form state only when opening or when project changes, to avoid
  // clobbering user edits due to unrelated project updates (e.g., NFR autosave)
  useEffect(() => {
    if (!open || !currentProject) return
    setCloudFamily(currentProject.cloud?.cloudFamily || 'public')
    setProfile({ ...defaultProfileState, ...(currentProject.profile || {}) })
    setRecipeId((currentProject.profile as any)?.recipe || '')
    setProjectName(currentProject.name || '')
    setProjectDescription(currentProject.description || '')
    // Derive region selection object from cloud
    const rs: any = {}
    rs.primary = currentProject.cloud?.primaryRegionId
    rs.drStrategy = (currentProject.cloud?.drStrategy as any) || (currentProject.cloud?.secondaryRegionId ? 'manual' : 'none')
    rs.secondary = currentProject.cloud?.secondaryRegionId
    setRegionSelection(rs)
    setResidencyPolicy((currentProject.cloud?.policies?.residency as any) || 'no-restriction')
    setResidencyCountries(currentProject.cloud?.policies?.countries || [])
    // Load per-project app log
    loadLog()
  }, [open, currentProject?.id])

  if (!open) return null

  const save = async () => {
    await updateProject({
      name: projectName || currentProject?.name,
      description: projectDescription,
      cloud: {
        provider: 'azure',
        cloudFamily,
        drStrategy: regionSelection?.drStrategy || 'none',
        primaryRegionId: regionSelection?.primary,
        secondaryRegionId: regionSelection?.drStrategy === 'paired' ? regionSelection?.pairedSuggestion : regionSelection?.secondary,
        policies: { residency: residencyPolicy, countries: residencyCountries }
      },
      profile: { ...(profile as any), recipe: recipeId || undefined },
    })
    onClose()
  }

  const handleRefreshFromServer = async () => {
    if (isRefreshingData) return
    try {
      setIsRefreshingData(true)
      await refreshProjects()
      addLog('sync', 'Reloaded project from Cosmos DB')
    } catch (error: any) {
      const message = error?.message || 'Unknown error'
      addLog('sync-error', `Failed to refresh from Cosmos DB: ${message}`)
      alert(`Failed to refresh from Cosmos DB: ${message}`)
    } finally {
      setIsRefreshingData(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-architect-gray-200 dark:border-gray-800 transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-architect-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-architect-gray-500 dark:text-gray-400">Project</div>
            {!editingIdentity ? (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-architect-gray-900 dark:text-gray-100">{projectName || currentProject?.name}</h3>
                <button className="text-xs text-architect-gray-600 dark:text-gray-300 border border-architect-gray-300 dark:border-gray-700 rounded px-2 py-0.5 hover:bg-architect-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setEditingIdentity(true)}>Edit</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input className="input-field" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                <button className="text-xs px-2 py-0.5 bg-architect-gray-100 dark:bg-gray-800 text-architect-gray-700 dark:text-gray-200 rounded hover:bg-architect-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => setEditingIdentity(false)}>Done</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-architect-gray-500 hover:text-architect-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Close</button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6 overflow-y-auto min-h-0 flex-1">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea className="input-field resize-none" rows={3} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Project description (optional)" />
          </div>

          {/* Cloud */}
          <div>
            <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-2">Cloud</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Cloud Family</label>
                <select
                  value={cloudFamily}
                  onChange={(e) => setCloudFamily(e.target.value as 'public' | 'gov')}
                  className="select-field"
                >
                  <option value="public">Azure Public</option>
                  <option value="gov">Azure US Government</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Regions & DR</label>
                <AzureRegionSelector id="project-region" value={regionSelection} onChange={setRegionSelection} />
              </div>
            </div>
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Residency Policy</label>
                <select
                  value={residencyPolicy}
                  onChange={(e)=>setResidencyPolicy(e.target.value as any)}
                  className="select-field"
                >
                  <option value="no-restriction">No restriction</option>
                  <option value="in-country">In country</option>
                  <option value="in-geo">In geography (e.g., EU-only)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Countries (ISO)</label>
                <input
                  type="text"
                  value={residencyCountries.join(', ')}
                  onChange={(e)=>setResidencyCountries(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
                  className="input-field"
                  placeholder="e.g., US, CA, DE"
                  disabled={residencyPolicy === 'no-restriction' || residencyPolicy === 'in-geo'}
                />
              </div>
            </div>
            {/* Blueprint / Constraints */}
            <div className="mt-4 p-3 border border-architect-gray-200 dark:border-gray-800 rounded bg-architect-gray-50 dark:bg-gray-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100">Blueprint (Constraints)</div>
                  <div className="text-xs text-architect-gray-600 dark:text-gray-400">Import allow/deny lists to guide planning across this project.</div>
                </div>
                <div className="flex items-center gap-2">
                  <BlueprintImportButton onImport={async (payload) => { await updateProject({ constraints: payload }) }} />
                  {currentProject?.constraints && (
                    <button
                      onClick={() => {
                        if (confirm('Removing the blueprint will disable enforcement for locked fields and may make deployment to the target environment impossible. Continue?')) {
                          updateProject({ constraints: undefined })
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Remove constraints"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {currentProject?.constraints && (
                <div className="mt-2 text-xs text-architect-gray-700 dark:text-gray-300">
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Allowed:</span> {currentProject.constraints.allowServiceIds?.length ?? 0}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Denied:</span> {currentProject.constraints.denyServiceIds?.length ?? 0}</div>
                  <div><span className="text-architect-gray-500 dark:text-gray-400">Locked fields:</span> {currentProject.constraints.nfrLocks?.length ?? 0}</div>
                  {currentProject.constraints.notes && (
                    <div className="mt-1"><span className="text-architect-gray-500 dark:text-gray-400">Notes:</span> {currentProject.constraints.notes}</div>
                  )}
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 rounded">
                    Blueprint is active. This app will enforce all locked fields and policy constraints. Overrides must be applied via the portal and re-imported.
                  </div>
                </div>
              )}
            </div>

            {/* Data Sync */}
            <div className="mt-4 p-3 border border-architect-gray-200 dark:border-gray-800 rounded bg-architect-gray-50 dark:bg-gray-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100">Cloud Sync</div>
                  <div className="text-xs text-architect-gray-600 dark:text-gray-400">Project changes are automatically saved to Cosmos DB. Use refresh to pull the latest snapshot.</div>
                </div>
                <button
                  onClick={handleRefreshFromServer}
                  disabled={isRefreshingData}
                  className="text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  {isRefreshingData ? 'Refreshing…' : 'Refresh from Cosmos'}
                </button>
              </div>
            </div>

            {/* App Log */}
            <div className="mt-4 p-3 border border-architect-gray-200 dark:border-gray-800 rounded bg-architect-gray-50 dark:bg-gray-900/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100">App Log</div>
                  <div className="text-xs text-architect-gray-600 dark:text-gray-400">Quietly records background actions like pricing refreshes, blueprint imports, and sync operations.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => {
                      const region = regionSelection?.primary || 'default'
                      addLog('pricing-refresh', `Pricing refresh requested for region '${region}' (stubbed)`, JSON.stringify({ region }, null, 2))
                    }}
                    className="text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    title="Request pricing refresh (stubbed)"
                  >
                    Refresh pricing
                  </button>
                  <button type="button"
                    onClick={() => {
                      const payload = appLog.map(e => `[${e.ts}] (${e.type}) ${e.message}${e.details ? `\n${e.details}` : ''}`).join('\n\n')
                      const doCopy = async () => {
                        try {
                          await navigator.clipboard.writeText(payload)
                          addLog('app-log', 'Copied app log to clipboard')
                        } catch {
                          try {
                            const ta = document.createElement('textarea')
                            ta.value = payload
                            ta.style.position = 'fixed'
                            ta.style.left = '-9999px'
                            document.body.appendChild(ta)
                            ta.focus(); ta.select()
                            document.execCommand('copy')
                            document.body.removeChild(ta)
                            addLog('app-log', 'Copied app log to clipboard (fallback)')
                          } catch {}
                        }
                      }
                      doCopy()
                    }}
                    className="text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    title="Copy all entries"
                  >
                    Copy
                  </button>
                  <button type="button"
                    onClick={() => { if (confirm('Clear all log entries?')) saveLog([]) }}
                    className="text-xs px-2 py-1 rounded border border-architect-gray-300 dark:border-gray-700 text-architect-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    title="Clear log"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="mt-2 border border-architect-gray-200 dark:border-gray-800 rounded bg-white/60 dark:bg-gray-900/50 max-h-48 overflow-y-auto">
                {appLog.length === 0 ? (
                  <div className="p-2 text-xs text-architect-gray-500 dark:text-gray-400">No entries yet.</div>
                ) : (
                  <ul className="divide-y divide-architect-gray-200 dark:divide-gray-800 text-xs">
                    {appLog.map((e, idx) => (
                      <li key={`${e.ts}-${idx}`} className="p-2">
                        <div className="font-medium text-architect-gray-900 dark:text-gray-100">[{e.ts}] ({e.type})</div>
                        <div className="whitespace-pre-wrap break-words text-architect-gray-800 dark:text-gray-300">{e.message}</div>
                        {e.details && (
                          <pre className="mt-1 whitespace-pre-wrap break-words text-architect-gray-700 dark:text-gray-400">{e.details}</pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Profile */}
          <div>
            <div className="text-sm font-semibold text-architect-gray-900 dark:text-gray-100 mb-2">Profile</div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Profile</label>
                <select value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as any })} className="select-field">
                  <option value="starter">Starter</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Global Size</label>
                <select value={profile.size} onChange={(e) => setProfile({ ...profile, size: e.target.value as any })} className="select-field">
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">Criticality</label>
                <select value={profile.criticality} onChange={(e) => setProfile({ ...profile, criticality: e.target.value as any })} className="select-field">
                  <option value="dev/test">Dev/Test</option>
                  <option value="prod">Production</option>
                  <option value="regulated">Regulated</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 p-3 border border-architect-gray-200 dark:border-gray-800 rounded bg-architect-gray-50 dark:bg-gray-900/60">
                <ToggleSwitch
                  id="waf-baseline-toggle"
                  checked={!!profile.useWafBaseline}
                  onChange={(checked) => setProfile({ ...profile, useWafBaseline: checked })}
                  ariaLabelledBy="waf-baseline-toggle-label"
                />
                <div
                  id="waf-baseline-toggle-label"
                  className="text-xs text-architect-gray-700 dark:text-gray-300 cursor-pointer select-none"
                  onClick={() => setProfile({ ...profile, useWafBaseline: !profile.useWafBaseline })}
                >
                  <span className="font-semibold block text-sm text-architect-gray-900 dark:text-gray-100">Use WAF baseline</span>
                  Automatically seed identity, networking, secrets, and observability services recommended by the Azure Well-Architected Framework.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-architect-gray-200 dark:border-gray-800 rounded bg-architect-gray-50 dark:bg-gray-900/60">
                <ToggleSwitch
                  id="waf-dynamic-toggle"
                  checked={!!profile.wafAdaptiveAdditions}
                  onChange={(checked) => setProfile({ ...profile, wafAdaptiveAdditions: checked })}
                  ariaLabelledBy="waf-dynamic-toggle-label"
                />
                <div
                  id="waf-dynamic-toggle-label"
                  className="text-xs text-architect-gray-700 dark:text-gray-300 cursor-pointer select-none"
                  onClick={() => setProfile({ ...profile, wafAdaptiveAdditions: !profile.wafAdaptiveAdditions })}
                >
                  <span className="font-semibold block text-sm text-architect-gray-900 dark:text-gray-100">Adaptive WAF recommendations</span>
                  Keeps the architecture in sync with captured NFRs by auto-adding or removing recommended services (e.g., private endpoints, monitoring toolchain).
                </div>
              </div>
            </div>
            {/* Recipes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-architect-gray-700 dark:text-gray-300 mb-1">NFR Recipe</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="select-field"
              >
                <option value="">None</option>
                {nfrRecipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {recipeId && (
                <div className="mt-1 text-xs text-architect-gray-600 dark:text-gray-400">
                  {nfrRecipes.find(r => r.id === recipeId)?.description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-architect-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-architect-gray-100 dark:bg-gray-800 text-architect-gray-700 dark:text-gray-200 rounded hover:bg-architect-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-azure-blue-600 text-white rounded hover:bg-azure-blue-700">Save</button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSettingsModal
