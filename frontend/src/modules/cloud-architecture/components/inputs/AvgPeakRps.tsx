import React, { useEffect, useMemo, useRef, useState } from 'react'

interface AvgPeakRpsProps {
  id: string
  value?: { ['average-rps']?: string | number; ['peak-rps']?: string | number }
  onChange: (fieldId: 'average-rps' | 'peak-rps', value: string) => void
  className?: string
}

const digitsOnly = (s: string) => s.replace(/,/g, '')
const isNumeric = (s: string) => /^\d+$/.test(s)
const commifyNumber = (n: number) => n.toLocaleString('en-US')

const AvgPeakRps: React.FC<AvgPeakRpsProps> = ({ id, value, onChange, className = '' }) => {
  const avgRef = useRef<HTMLInputElement>(null)
  const peakRef = useRef<HTMLInputElement>(null)
  const [avg, setAvg] = useState<string>(value?.['average-rps'] ? String(value['average-rps']) : '')
  const [peak, setPeak] = useState<string>(value?.['peak-rps'] ? String(value['peak-rps']) : '')
  const [avgError, setAvgError] = useState<string>('')
  const [peakError, setPeakError] = useState<string>('')

  useEffect(() => {
    setAvg(value?.['average-rps'] ? String(value['average-rps']) : '')
    setPeak(value?.['peak-rps'] ? String(value['peak-rps']) : '')
  }, [value?.['average-rps'], value?.['peak-rps']])

  const validateAndFormat = (field: 'average-rps' | 'peak-rps') => {
    const current = field === 'average-rps' ? avg : peak
    const trimmed = current.trim()
    const raw = digitsOnly(trimmed)
    if (trimmed === '' || !isNumeric(raw)) {
      if (field === 'average-rps') {
        setAvgError('Enter a valid number')
        setTimeout(() => avgRef.current?.focus(), 0)
      } else {
        setPeakError('Enter a valid number')
        setTimeout(() => peakRef.current?.focus(), 0)
      }
      return false
    }
    // format
    const n = parseInt(raw, 10)
    const formatted = commifyNumber(n)
    if (field === 'average-rps') {
      setAvg(formatted)
      setAvgError('')
    } else {
      setPeak(formatted)
      setPeakError('')
    }
    onChange(field, formatted)
    return true
  }

  // Cross-field validation: avg <= peak (when both numeric)
  const crossValidate = () => {
    const aRaw = digitsOnly((avg || '').trim())
    const pRaw = digitsOnly((peak || '').trim())
    if (isNumeric(aRaw) && isNumeric(pRaw)) {
      const a = parseInt(aRaw, 10)
      const p = parseInt(pRaw, 10)
      if (a > p) {
        setPeakError('Peak RPS should be ≥ Average RPS')
        setTimeout(() => peakRef.current?.focus(), 0)
        return false
      } else {
        setPeakError('')
      }
    }
    return true
  }

  return (
    <div className={`mt-1 ${className}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <label htmlFor={`${id}-average-rps`} className="block text-[11px] font-medium text-gray-700 mb-0.5">Average RPS</label>
          <input
            id={`${id}-average-rps`}
            ref={avgRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9,]*"
            value={avg}
            onChange={(e) => {
              setAvg(e.target.value)
              if (avgError) setAvgError('')
            }}
            onBlur={() => { if (validateAndFormat('average-rps')) crossValidate() }}
            className={`block w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm ${avgError ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="1,000"
          />
          {avgError && <div className="mt-0.5 text-[10px] text-red-600">{avgError}</div>}
        </div>
        <div className="w-32">
          <label htmlFor={`${id}-peak-rps`} className="block text-[11px] font-medium text-gray-700 mb-0.5">Peak RPS</label>
          <input
            id={`${id}-peak-rps`}
            ref={peakRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9,]*"
            value={peak}
            onChange={(e) => {
              setPeak(e.target.value)
              if (peakError) setPeakError('')
            }}
            onBlur={() => { if (validateAndFormat('peak-rps')) crossValidate() }}
            className={`block w-full px-2 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm ${peakError ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="5,000"
          />
          {peakError && <div className="mt-0.5 text-[10px] text-red-600">{peakError}</div>}
        </div>
      </div>
    </div>
  )
}

export default AvgPeakRps

