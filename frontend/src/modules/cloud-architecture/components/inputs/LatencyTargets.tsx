import React, { useEffect, useState } from 'react'

export interface LatencyTargetsValue {
  p95: { value: number | ''; unit: 'ms' | 'seconds' }
  p99: { value: number | ''; unit: 'ms' | 'seconds' }
}

interface LatencyTargetsProps {
  id: string
  value?: LatencyTargetsValue
  onChange: (value: LatencyTargetsValue) => void
  className?: string
}

const LatencyTargets: React.FC<LatencyTargetsProps> = ({ id, value, onChange, className = '' }) => {
  const normalize = (v: any): LatencyTargetsValue => {
    if (v && typeof v === 'object') {
      // New shape
      if (v.p95 && v.p99) {
        return {
          p95: { value: v.p95.value ?? '', unit: (v.p95.unit as any) ?? 'ms' },
          p99: { value: v.p99.value ?? '', unit: (v.p99.unit as any) ?? 'ms' },
        }
      }
      // Legacy compound shape
      const hasLegacy = 'p95-value' in v || 'p99-value' in v
      if (hasLegacy) {
        return {
          p95: { value: v['p95-value'] ?? '', unit: (v['p95-unit'] as any) ?? 'ms' },
          p99: { value: v['p99-value'] ?? '', unit: (v['p99-unit'] as any) ?? 'ms' },
        }
      }
    }
    return { p95: { value: '', unit: 'ms' }, p99: { value: '', unit: 'ms' } }
  }

  const [internal, setInternal] = useState<LatencyTargetsValue>(normalize(value))

  useEffect(() => { setInternal(normalize(value)) }, [value])

  const update = (path: 'p95'|'p99', key: 'value'|'unit', val: any) => {
    const next = { ...internal, [path]: { ...internal[path], [key]: val } } as LatencyTargetsValue
    setInternal(next)
    onChange(next)
  }

  const toMs = (v?: {value: number|''; unit: 'ms'|'seconds'}) => !v || v.value === '' ? NaN : (v.unit === 'ms' ? (v.value as number) : (v.value as number) * 1000)
  const p95ms = toMs(internal?.p95)
  const p99ms = toMs(internal?.p99)
  const invalidOrder = !isNaN(p95ms) && !isNaN(p99ms) && p95ms >= p99ms

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-p95`} className="block text-xs font-medium text-gray-700 mb-1">P95 Latency</label>
          <div className="flex gap-2">
            <input id={`${id}-p95`} inputMode="numeric" pattern="[0-9]*" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" placeholder="200" value={internal.p95.value} onChange={(e)=>update('p95','value', e.target.value === '' ? '' : parseInt(e.target.value,10))}/>
            <select className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" value={internal.p95.unit} onChange={(e)=>update('p95','unit', e.target.value)}>
              <option value="ms">ms</option>
              <option value="seconds">seconds</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-p99`} className="block text-xs font-medium text-gray-700 mb-1">P99 Latency</label>
          <div className="flex gap-2">
            <input id={`${id}-p99`} inputMode="numeric" pattern="[0-9]*" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" placeholder="500" value={internal.p99.value} onChange={(e)=>update('p99','value', e.target.value === '' ? '' : parseInt(e.target.value,10))}/>
            <select className="px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" value={internal.p99.unit} onChange={(e)=>update('p99','unit', e.target.value)}>
              <option value="ms">ms</option>
              <option value="seconds">seconds</option>
            </select>
          </div>
        </div>
      </div>
      {invalidOrder && (
        <div className="text-xs text-red-600">P95 should be lower than P99.</div>
      )}
    </div>
  )
}

export default LatencyTargets
