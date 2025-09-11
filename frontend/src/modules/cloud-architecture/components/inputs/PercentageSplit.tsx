import React, { useCallback, useEffect, useMemo, useState } from 'react'

export interface PercentageSplitValue {
  read: number | ''
  write: number | ''
}

interface PercentageSplitProps {
  id: string
  value?: PercentageSplitValue
  onChange: (value: PercentageSplitValue) => void
  labels?: { read?: string; write?: string }
  className?: string
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

const PercentageSplit: React.FC<PercentageSplitProps> = ({ id, value, onChange, labels, className = '' }) => {
  const [internal, setInternal] = useState<PercentageSplitValue>({ read: value?.read ?? '', write: value?.write ?? '' })

  useEffect(() => {
    if (value) setInternal(value)
  }, [value])

  const total = useMemo(() => {
    const r = typeof internal.read === 'number' ? internal.read : 0
    const w = typeof internal.write === 'number' ? internal.write : 0
    return r + w
  }, [internal])

  const setRead = useCallback((v: string) => {
    const n = v === '' ? '' : clamp(parseInt(v, 10))
    const next = { ...internal, read: n }
    setInternal(next)
    onChange(next)
  }, [internal, onChange])

  const setWrite = useCallback((v: string) => {
    const n = v === '' ? '' : clamp(parseInt(v, 10))
    const next = { ...internal, write: n }
    setInternal(next)
    onChange(next)
  }, [internal, onChange])

  const invalid = total !== 100 && (internal.read !== '' || internal.write !== '')

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-read`} className="block text-xs font-medium text-gray-700 mb-1">{labels?.read || 'Reads %'}</label>
          <input id={`${id}-read`} inputMode="numeric" pattern="[0-9]*" value={internal.read}
            onChange={(e) => setRead(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" placeholder="80" />
        </div>
        <div>
          <label htmlFor={`${id}-write`} className="block text-xs font-medium text-gray-700 mb-1">{labels?.write || 'Writes %'}</label>
          <input id={`${id}-write`} inputMode="numeric" pattern="[0-9]*" value={internal.write}
            onChange={(e) => setWrite(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm" placeholder="20" />
        </div>
      </div>
      <div className="text-xs text-gray-600">Total: <span className={invalid ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>{total}</span>% (must equal 100%)</div>
    </div>
  )
}

export default PercentageSplit

