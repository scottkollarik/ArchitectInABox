import React, { useEffect, useState } from 'react'

export interface SizeRangeValue {
  min: number | ''
  max: number | ''
  unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB'
}

interface SizeRangeProps {
  id: string
  value?: SizeRangeValue
  onChange: (value: SizeRangeValue) => void
  className?: string
}

const SizeRange: React.FC<SizeRangeProps> = ({ id, value, onChange, className = '' }) => {
  const [v, setV] = useState<SizeRangeValue>({ min: value?.min ?? '', max: value?.max ?? '', unit: (value?.unit ?? 'KB') as any })
  useEffect(()=>{ if (value) setV(value) }, [value])

  const update = (key: keyof SizeRangeValue, val: any) => {
    const next = { ...v, [key]: val }
    setV(next)
    onChange(next)
  }

  const invalid = typeof v.min === 'number' && typeof v.max === 'number' && v.min > v.max

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor={`${id}-min`} className="block text-xs font-medium text-gray-700 mb-1">Min</label>
          <input id={`${id}-min`} inputMode="numeric" pattern="[0-9]*" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" value={v.min} onChange={(e)=>update('min', e.target.value === '' ? '' : parseInt(e.target.value,10))} />
        </div>
        <div>
          <label htmlFor={`${id}-max`} className="block text-xs font-medium text-gray-700 mb-1">Max</label>
          <input id={`${id}-max`} inputMode="numeric" pattern="[0-9]*" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" value={v.max} onChange={(e)=>update('max', e.target.value === '' ? '' : parseInt(e.target.value,10))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
          <select className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" value={v.unit} onChange={(e)=>update('unit', e.target.value)}>
            {['B','KB','MB','GB','TB'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      {invalid && <div className="text-xs text-red-600">Min should be less than or equal to Max.</div>}
    </div>
  )
}

export default SizeRange

