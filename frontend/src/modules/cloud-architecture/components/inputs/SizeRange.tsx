import React, { useEffect, useRef, useState } from 'react'

export interface SizeRangeValue {
  min: number | ''
  max: number | ''
  // Backward compatibility: when both units are equal, `unit` may be set
  unit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB'
  // New dual-unit support
  minUnit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB'
  maxUnit?: 'B' | 'KB' | 'MB' | 'GB' | 'TB'
}

interface SizeRangeProps {
  id: string
  value?: SizeRangeValue
  onChange: (value: SizeRangeValue) => void
  className?: string
}

const SizeRange: React.FC<SizeRangeProps> = ({ id, value, onChange, className = '' }) => {
  const initialMinUnit = (value?.minUnit || value?.unit || 'KB') as any
  const initialMaxUnit = (value?.maxUnit || value?.unit || 'KB') as any
  const [v, setV] = useState<SizeRangeValue>({ min: value?.min ?? '', max: value?.max ?? '', minUnit: initialMinUnit, maxUnit: initialMaxUnit, unit: (initialMinUnit === initialMaxUnit ? initialMinUnit : undefined) as any })
  const [minError, setMinError] = useState<string>('')
  const [maxError, setMaxError] = useState<string>('')
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  useEffect(()=>{
    if (value) {
      const minUnit = (value.minUnit || value.unit || 'KB') as any
      const maxUnit = (value.maxUnit || value.unit || 'KB') as any
      setV({
        min: typeof value.min === 'number' ? (isNaN(value.min) ? '' : value.min) : '',
        max: typeof value.max === 'number' ? (isNaN(value.max) ? '' : value.max) : '',
        minUnit,
        maxUnit,
        unit: minUnit === maxUnit ? minUnit : undefined
      })
    }
  }, [value])

  const update = (key: keyof SizeRangeValue, val: any) => {
    // Compute next state
    const nextRaw = { ...v, [key]: val }
    // Keep `unit` in sync only when min/max units match, otherwise drop it
    const nextUnit = nextRaw.minUnit === nextRaw.maxUnit ? nextRaw.minUnit : undefined
    const next: SizeRangeValue = { ...nextRaw, unit: nextUnit }
    setV(next)
    // Only commit when blank or numeric for numeric fields; always for unit changes
    const isNumericField = key === 'min' || key === 'max'
    if (!isNumericField || val === '' || typeof val === 'number') onChange(next)
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
    <div className={`space-y-0 ${className}`}>
      <div className="flex items-end gap-2 flex-wrap">
        <div>
        <label htmlFor={`${id}-min`} className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Min</label>
          <div className="flex items-end gap-1">
            <input id={`${id}-min`} ref={minRef} inputMode="numeric" pattern="[0-9]*" className={`block w-20 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${minError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} value={v.min} onChange={(e)=>{ setMinError(''); const raw=e.target.value; if (raw===''){ update('min','') } else { const n=parseInt(raw,10); if (!isNaN(n)) update('min', n); else setMinError('Enter a valid number') } }} onBlur={()=>validateBlur('min')} />
            <select aria-label="Min unit" className="block w-18 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm" value={v.minUnit} onChange={(e)=>update('minUnit', e.target.value)}>
              {['B','KB','MB','GB','TB'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {minError && <div className="mt-0.5 text-[10px] text-red-600">{minError}</div>}
        </div>
        <div>
        <label htmlFor={`${id}-max`} className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">Max</label>
          <div className="flex items-end gap-1">
            <input id={`${id}-max`} ref={maxRef} inputMode="numeric" pattern="[0-9]*" className={`block w-20 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${maxError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} value={v.max} onChange={(e)=>{ setMaxError(''); const raw=e.target.value; if (raw===''){ update('max','') } else { const n=parseInt(raw,10); if (!isNaN(n)) update('max', n); else setMaxError('Enter a valid number') } }} onBlur={()=>validateBlur('max')} />
            <select aria-label="Max unit" className="block w-18 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm" value={v.maxUnit} onChange={(e)=>update('maxUnit', e.target.value)}>
              {['B','KB','MB','GB','TB'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {maxError && <div className="mt-0.5 text-[10px] text-red-600">{maxError}</div>}
        </div>
      </div>
      {invalid && <div className="text-xs text-red-600 dark:text-red-400">Min should be less than or equal to Max.</div>}
    </div>
  )
}

export default SizeRange
