import React, { useEffect, useState } from 'react'

interface ExpectedRpsInputProps {
  id: string
  value?: string | number
  onChange: (value: string) => void
  className?: string
}

const digitsOnly = (s: string) => s.replace(/\D+/g, '')
const isNumeric = (s: string) => /^\d+$/.test(s)
const formatNumber = (n: number) => {
  try {
    return new Intl.NumberFormat(undefined).format(n)
  } catch {
    return n.toString()
  }
}

const ExpectedRpsInput: React.FC<ExpectedRpsInputProps> = ({ id, value, onChange, className = '' }) => {
  const [display, setDisplay] = useState<string>(value ? String(value) : '')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setDisplay('')
      return
    }
    const raw = digitsOnly(String(value))
    if (!raw) {
      setDisplay(String(value))
      return
    }
    const numeric = parseInt(raw, 10)
    setDisplay(Number.isFinite(numeric) ? formatNumber(numeric) : String(value))
  }, [value])

  const commit = () => {
    const trimmed = display.trim()
    if (trimmed === '') {
      setError('')
      onChange('')
      return true
    }
    const raw = digitsOnly(trimmed)
    if (!isNumeric(raw)) {
      setError('Enter a whole number')
      return false
    }
    const numeric = parseInt(raw, 10)
    const formatted = formatNumber(numeric)
    setDisplay(formatted)
    setError('')
    onChange(formatted)
    return true
  }

  return (
    <div className={className}>
      <div className="mt-1 inline-flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            setDisplay(e.target.value)
            if (error) setError('')
          }}
          onBlur={commit}
          className={`block w-36 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm ${error ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="e.g., 1,000"
        />
        <span className="text-sm text-gray-500">RPS</span>
      </div>
      {error && <div className="mt-0.5 text-[10px] text-red-600">{error}</div>}
    </div>
  )
}

export default ExpectedRpsInput
