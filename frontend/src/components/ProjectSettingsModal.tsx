import React, { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import AzureRegionSelector from '../modules/cloud-architecture/components/inputs/AzureRegionSelector'
import BlueprintImportButton from '../modules/cloud-architecture/components/BlueprintImportButton'

const ProjectSettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentProject, updateProject } = useProject()
  const [cloudFamily, setCloudFamily] = useState<'public' | 'gov'>('public')
  const [regionSelection, setRegionSelection] = useState<any>({})
  const [residencyPolicy, setResidencyPolicy] = useState<'no-restriction'|'in-country'|'in-geo'|'custom'>('no-restriction')
  const [residencyCountries, setResidencyCountries] = useState<string[]>([])
  const [profile, setProfile] = useState({ level: 'starter', size: 'M', criticality: 'dev/test' })
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [editingIdentity, setEditingIdentity] = useState(false)

  useEffect(() => {
    if (!currentProject) return
    setCloudFamily(currentProject.cloud?.cloudFamily || 'public')
    setProfile(currentProject.profile || { level: 'starter', size: 'M', criticality: 'dev/test' })
    setProjectName(currentProject.name || '')
    setProjectDescription(currentProject.description || '')
    // Derive region selection object from cloud
    const rs: any = {}
    rs.primary = currentProject.cloud?.primaryRegionId
    rs.drStrategy = currentProject.cloud?.secondaryRegionId ? 'manual' : 'none'
    rs.secondary = currentProject.cloud?.secondaryRegionId
    setRegionSelection(rs)
    setResidencyPolicy((currentProject.cloud?.policies?.residency as any) || 'no-restriction')
    setResidencyCountries(currentProject.cloud?.policies?.countries || [])
  }, [currentProject])

  if (!open) return null

  const save = async () => {
    await updateProject({
      name: projectName || currentProject?.name,
      description: projectDescription,
      cloud: {
        provider: 'azure',
        cloudFamily,
        primaryRegionId: regionSelection?.primary,
        secondaryRegionId: regionSelection?.drStrategy === 'paired' ? regionSelection?.pairedSuggestion : regionSelection?.secondary,
        policies: { residency: residencyPolicy, countries: residencyCountries }
      },
      profile: profile as any,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        {/* Header */}
        <div className="p-4 border-b border-architect-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-architect-gray-500">Project</div>
            {!editingIdentity ? (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-architect-gray-900">{projectName || currentProject?.name}</h3>
                <button className="text-xs text-architect-gray-600 border border-architect-gray-300 rounded px-2 py-0.5 hover:bg-architect-gray-50" onClick={() => setEditingIdentity(true)}>Edit</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input className="px-2 py-1 border border-architect-gray-300 rounded" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                <button className="text-xs px-2 py-0.5 bg-architect-gray-100 rounded" onClick={() => setEditingIdentity(false)}>Done</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-architect-gray-500 hover:text-architect-gray-700">Close</button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-architect-gray-700 mb-1">Description</label>
            <textarea className="w-full px-3 py-2 border border-architect-gray-300 rounded" rows={3} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Project description (optional)" />
          </div>

          {/* Cloud */}
          <div>
            <div className="text-sm font-semibold text-architect-gray-900 mb-2">Cloud</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Cloud Family</label>
                <select
                  value={cloudFamily}
                  onChange={(e) => setCloudFamily(e.target.value as 'public' | 'gov')}
                  className="w-full px-3 py-2 border border-architect-gray-300 rounded"
                >
                  <option value="public">Azure Public</option>
                  <option value="gov">Azure US Government</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Regions & DR</label>
                <AzureRegionSelector id="project-region" value={regionSelection} onChange={setRegionSelection} />
              </div>
            </div>
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Residency Policy</label>
                <select
                  value={residencyPolicy}
                  onChange={(e)=>setResidencyPolicy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-architect-gray-300 rounded"
                >
                  <option value="no-restriction">No restriction</option>
                  <option value="in-country">In country</option>
                  <option value="in-geo">In geography (e.g., EU-only)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Countries (ISO)</label>
                <input
                  type="text"
                  value={residencyCountries.join(', ')}
                  onChange={(e)=>setResidencyCountries(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
                  className="w-full px-3 py-2 border border-architect-gray-300 rounded"
                  placeholder="e.g., US, CA, DE"
                  disabled={residencyPolicy === 'no-restriction' || residencyPolicy === 'in-geo'}
                />
              </div>
            </div>
            {/* Blueprint / Constraints */}
            <div className="mt-4 p-3 border border-architect-gray-200 rounded bg-architect-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-architect-gray-900">Blueprint (Constraints)</div>
                  <div className="text-xs text-architect-gray-600">Import allow/deny lists to guide planning across this project.</div>
                </div>
                <div className="flex items-center gap-2">
                  <BlueprintImportButton onImport={async (payload) => { await updateProject({ constraints: payload }) }} />
                  {currentProject?.constraints && (
                    <button
                      onClick={() => updateProject({ constraints: undefined })}
                      className="text-xs px-2 py-1 rounded border border-architect-gray-300 text-architect-gray-700 hover:bg-white"
                      title="Remove constraints"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {currentProject?.constraints && (
                <div className="mt-2 text-xs text-architect-gray-700">
                  <div><span className="text-architect-gray-500">Allowed:</span> {currentProject.constraints.allowServiceIds?.length ?? 0}</div>
                  <div><span className="text-architect-gray-500">Denied:</span> {currentProject.constraints.denyServiceIds?.length ?? 0}</div>
                  {currentProject.constraints.notes && (
                    <div className="mt-1"><span className="text-architect-gray-500">Notes:</span> {currentProject.constraints.notes}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile */}
          <div>
            <div className="text-sm font-semibold text-architect-gray-900 mb-2">Profile</div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Profile</label>
                <select value={profile.level} onChange={(e) => setProfile({ ...profile, level: e.target.value as any })} className="w-full px-3 py-2 border border-architect-gray-300 rounded">
                  <option value="starter">Starter</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Global Size</label>
                <select value={profile.size} onChange={(e) => setProfile({ ...profile, size: e.target.value as any })} className="w-full px-3 py-2 border border-architect-gray-300 rounded">
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-architect-gray-700 mb-1">Criticality</label>
                <select value={profile.criticality} onChange={(e) => setProfile({ ...profile, criticality: e.target.value as any })} className="w-full px-3 py-2 border border-architect-gray-300 rounded">
                  <option value="dev/test">Dev/Test</option>
                  <option value="prod">Production</option>
                  <option value="regulated">Regulated</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-architect-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-architect-gray-100 text-architect-gray-700 rounded hover:bg-architect-gray-200">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-azure-blue-600 text-white rounded hover:bg-azure-blue-700">Save</button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSettingsModal
