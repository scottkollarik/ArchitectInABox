import React, { useEffect, useRef, useState } from 'react'

export interface LatencyTargetsValueMs {
  p95: number | '' // milliseconds
  p99: number | '' // milliseconds
}

interface LatencyTargetsProps {
  id: string
  value?: any
  onChange: (value: LatencyTargetsValueMs) => void
  className?: string
}

const LatencyTargets: React.FC<LatencyTargetsProps> = ({ id, value, onChange, className = '' }) => {
  const toMs = (input: any): number | '' => {
    if (input === null || input === undefined || input === '') return ''
    if (typeof input === 'number') return input
    if (typeof input === 'string') {
      const parsed = parseFloat(input)
      return Number.isFinite(parsed) ? parsed : ''
    }
    if (typeof input === 'object') {
      const rawValue = input.value ?? input.amount ?? ''
      if (rawValue === '' || rawValue === null || rawValue === undefined) return ''
      const numeric = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue)
      if (!Number.isFinite(numeric)) return ''
      const unit = (input.unit || input.units || 'ms') as string
      if (unit === 'seconds' || unit === 's') return numeric * 1000
      return numeric
    }
    return ''
  }

  const normalize = (v: any): LatencyTargetsValueMs => {
    if (v && typeof v === 'object') {
      if ('p95' in v || 'p99' in v) {
        return {
          p95: toMs((v as any).p95),
          p99: toMs((v as any).p99),
        }
      }
      if ('p95-value' in v || 'p99-value' in v) {
        const legacyToMs = (val: any, unit: string | undefined) => {
          if (val === '' || val === null || val === undefined) return ''
          const numeric = typeof val === 'number' ? val : parseFloat(val)
          if (!Number.isFinite(numeric)) return ''
          return unit === 'seconds' ? numeric * 1000 : numeric
        }
        return {
          p95: legacyToMs(v['p95-value'], v['p95-unit']),
          p99: legacyToMs(v['p99-value'], v['p99-unit']),
        } as any
      }
    }
    return { p95: '', p99: '' }
  }

  const [internal, setInternal] = useState<LatencyTargetsValueMs>(normalize(value))
  const [p95Err, setP95Err] = useState<string>('')
  const [p99Err, setP99Err] = useState<string>('')
  const p95Ref = useRef<HTMLInputElement>(null)
  const p99Ref = useRef<HTMLInputElement>(null)
  useEffect(() => { setInternal(normalize(value)) }, [value])

  const update = (key: 'p95'|'p99', raw: string) => {
    const n = raw === '' ? '' : parseInt(raw, 10)
    const next = { ...internal, [key]: (isNaN(n as any) ? raw : (n as any)) } as any
    setInternal(next)
  }

  const p95 = typeof internal.p95 === 'number' ? internal.p95 : NaN
  const p99 = typeof internal.p99 === 'number' ? internal.p99 : NaN
  const invalidOrder = !isNaN(p95) && !isNaN(p99) && p95 >= p99

  const secHint = (ms: number | '') => {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 1000) return null
    const s = (ms / 1000).toFixed(2)
    return `≈ ${s} s`
  }

  const validateNumber = (key: 'p95'|'p99') => {
    const val = key === 'p95' ? internal.p95 : internal.p99
    const setErr = key === 'p95' ? setP95Err : setP99Err
    const ref = key === 'p95' ? p95Ref : p99Ref
    if (val === '' || typeof val === 'number') { setErr(''); onChange(internal); return true }
    setErr('Enter a valid number')
    return false
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-0">
        <label htmlFor={`${id}-p95`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">P95 (ms)</label>
          <div className="flex items-center gap-1">
            <input id={`${id}-p95`} ref={p95Ref} inputMode="numeric" pattern="[0-9]*" className={`block w-24 px-2 py-1.5 border rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${p95Err ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} placeholder="200" value={internal.p95}
              onChange={(e)=>{ setP95Err(''); update('p95', e.target.value)}} onBlur={()=>validateNumber('p95')} />
            <div className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{secHint(internal.p95)}</div>
          </div>
          {p95Err && <div className="text-[10px] text-red-600 mt-0.5">{p95Err}</div>}
        </div>
        <div className="flex-0">
        <label htmlFor={`${id}-p99`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">P99 (ms)</label>
          <div className="flex items-center gap-1">
            <input id={`${id}-p99`} ref={p99Ref} inputMode="numeric" pattern="[0-9]*" className={`block w-24 px-2 py-1.5 border rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${p99Err ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} placeholder="500" value={internal.p99}
              onChange={(e)=>{ setP99Err(''); update('p99', e.target.value)}} onBlur={()=>validateNumber('p99')} />
            <div className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{secHint(internal.p99)}</div>
          </div>
          {p99Err && <div className="text-[10px] text-red-600 mt-0.5">{p99Err}</div>}
        </div>
      </div>
      {invalidOrder && (
        <div className="text-xs text-red-600">P95 should be lower than P99.</div>
      )}
    </div>
  )
}

export default LatencyTargets
