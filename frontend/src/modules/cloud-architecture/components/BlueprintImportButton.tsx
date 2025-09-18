import React, { useRef } from 'react'
import type { ProjectConstraints } from '../../cloud-architecture/types'

const BlueprintImportButton: React.FC<{ onImport: (c: ProjectConstraints) => Promise<void> }>=({ onImport })=>{
  const inputRef = useRef<HTMLInputElement>(null)
  const onClick = ()=> inputRef.current?.click()
  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const payload: ProjectConstraints = {
        allowServiceIds: Array.isArray(json.allowServiceIds) ? json.allowServiceIds : undefined,
        denyServiceIds: Array.isArray(json.denyServiceIds) ? json.denyServiceIds : undefined,
        notes: typeof json.notes === 'string' ? json.notes : undefined,
        nfrLocks: Array.isArray(json.nfrLocks) ? json.nfrLocks.filter((l: any) => typeof l?.path === 'string' && (l.mode === 'locked' || l.mode === 'policy-only')) : undefined,
      }
      await onImport(payload)
      alert('Blueprint imported. Constraints applied.')
    } catch (err) {
      alert('Failed to import blueprint. Ensure it is valid JSON.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }
  return (
    <>
      <button onClick={onClick} className="text-xs px-2 py-1 rounded border border-azure-blue-300 text-azure-blue-700 hover:bg-white">Import Blueprint</button>
      <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={onChange} />
    </>
  )
}

export default BlueprintImportButton
