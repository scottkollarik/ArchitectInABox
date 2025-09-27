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
  mode?: 'inputs' | 'slider'
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n))

const PercentageSplit: React.FC<PercentageSplitProps> = ({ id, value, onChange, labels, className = '', mode = 'inputs' }) => {
  const [internal, setInternal] = useState<PercentageSplitValue>({ read: value?.read ?? '', write: value?.write ?? '' })

  useEffect(() => {
    if (value) {
      setInternal({
        read: value.read ?? '',
        write: value.write ?? ''
      })
    }
  }, [value])

  const total = useMemo(() => {
    const r = typeof internal.read === 'number' ? internal.read : 0
    const w = typeof internal.write === 'number' ? internal.write : 0
    return r + w
  }, [internal])

  const setRead = useCallback((v: string) => {
    const n: '' | number = v === '' ? '' : clamp(parseInt(v, 10))
    const next: PercentageSplitValue = { ...internal, read: n }
    setInternal(next)
    onChange(next)
  }, [internal, onChange])

  const setWrite = useCallback((v: string) => {
    const n: '' | number = v === '' ? '' : clamp(parseInt(v, 10))
    const next: PercentageSplitValue = { ...internal, write: n }
    setInternal(next)
    onChange(next)
  }, [internal, onChange])

  const invalid = total !== 100 && (internal.read !== '' || internal.write !== '')

  if (mode === 'slider') {
    const sliderWrite = typeof internal.write === 'number' ? internal.write : (typeof value?.write === 'number' ? (value!.write as number) : 50)
    const sliderRead = 100 - sliderWrite
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="w-1/3 min-w-[220px] max-w-[360px]">
          <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
            <span>{labels?.read || 'Reads'} {sliderRead}%</span>
            <span>{labels?.write || 'Writes'} {sliderWrite}%</span>
          </div>
          <input
            id={`${id}-slider`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliderWrite}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              const next = { read: 100 - n, write: n }
              setInternal(next)
              onChange(next)
            }}
            className="slider-mixer"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-read`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{labels?.read || 'Reads %'}</label>
          <input id={`${id}-read`} inputMode="numeric" pattern="[0-9]*" value={internal.read === '' || internal.read === undefined || internal.read === null ? '' : String(internal.read)}
            onChange={(e) => setRead(e.target.value)}
            className="block w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="80" />
        </div>
        <div>
          <label htmlFor={`${id}-write`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{labels?.write || 'Writes %'}</label>
          <input id={`${id}-write`} inputMode="numeric" pattern="[0-9]*" value={internal.write === '' || internal.write === undefined || internal.write === null ? '' : String(internal.write)}
            onChange={(e) => setWrite(e.target.value)}
            className="block w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="20" />
        </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">Total: <span className={invalid ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100 font-medium'}>{total}</span>% (must equal 100%)</div>
    </div>
  )
}

export default PercentageSplit
