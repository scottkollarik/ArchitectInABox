import React, { useEffect, useRef, useState } from 'react'

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
  const [minError, setMinError] = useState<string>('')
  const [maxError, setMaxError] = useState<string>('')
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  useEffect(()=>{ if (value) setV(value) }, [value])

  const update = (key: keyof SizeRangeValue, val: any) => {
    const next = { ...v, [key]: val }
    setV(next)
    onChange(next)
  }

  const invalid = typeof v.min === 'number' && typeof v.max === 'number' && v.min > v.max

  const digitsOnly = (s: string) => s.replace(/,/g, '')
  const isNumeric = (s: string) => /^\d+$/.test(s)

  const validateBlur = (field: 'min'|'max') => {
    const current = field === 'min' ? v.min : v.max
    const ref = field === 'min' ? minRef : maxRef
    const setErr = field === 'min' ? setMinError : setMaxError
    if (current === '') { setErr(''); return }
    const raw = String(current)
    if (!isNumeric(digitsOnly(raw))) {
      setErr('Enter a valid number')
      setTimeout(()=>ref.current?.focus(), 0)
      return
    }
    setErr('')
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor={`${id}-min`} className="block text-xs font-medium text-gray-700 mb-1">Min</label>
          <input id={`${id}-min`} ref={minRef} inputMode="numeric" pattern="[0-9]*" className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm ${minError ? 'border-red-400' : 'border-gray-300'}`} value={v.min} onChange={(e)=>{ setMinError(''); update('min', e.target.value === '' ? '' : parseInt(e.target.value,10))}} onBlur={()=>validateBlur('min')} />
          {minError && <div className="mt-0.5 text-[10px] text-red-600">{minError}</div>}
        </div>
        <div>
          <label htmlFor={`${id}-max`} className="block text-xs font-medium text-gray-700 mb-1">Max</label>
          <input id={`${id}-max`} ref={maxRef} inputMode="numeric" pattern="[0-9]*" className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm ${maxError ? 'border-red-400' : 'border-gray-300'}`} value={v.max} onChange={(e)=>{ setMaxError(''); update('max', e.target.value === '' ? '' : parseInt(e.target.value,10))}} onBlur={()=>validateBlur('max')} />
          {maxError && <div className="mt-0.5 text-[10px] text-red-600">{maxError}</div>}
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
