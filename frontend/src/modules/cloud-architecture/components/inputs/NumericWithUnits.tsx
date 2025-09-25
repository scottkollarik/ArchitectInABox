import React, { useState, useEffect, useCallback, useRef } from 'react'

export interface NumericWithUnitsValue {
  value: number | ''
  unit: string
}

export interface NumericWithUnitsProps {
  id: string
  value?: NumericWithUnitsValue
  onChange: (value: NumericWithUnitsValue) => void
  units: string[]
  defaultUnit?: string
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  allowDecimals?: boolean
}

const NumericWithUnits: React.FC<NumericWithUnitsProps> = ({
  id,
  value,
  onChange,
  units,
  defaultUnit,
  placeholder = "0",
  label,
  className = "",
  disabled = false,
  min,
  max,
  step = 1,
  allowDecimals = false
}) => {
  const [internalValue, setInternalValue] = useState<NumericWithUnitsValue>({
    value: value?.value || '',
    unit: value?.unit || defaultUnit || units[0]
  })
  const [err, setErr] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Update internal state when external value changes
  useEffect(() => {
    if (value) {
      setInternalValue(value)
    }
  }, [value])

  const handleValueChange = useCallback((newValue: string) => {
    let processedValue: number | '' = ''
    
    if (newValue !== '') {
      const numericValue = allowDecimals ? parseFloat(newValue) : parseInt(newValue, 10)
      
      if (!isNaN(numericValue)) {
        // Apply min/max constraints
        let constrainedValue = numericValue
        if (min !== undefined && constrainedValue < min) constrainedValue = min
        if (max !== undefined && constrainedValue > max) constrainedValue = max
        
        processedValue = constrainedValue
      } else {
        // invalid: set internal only, show error, do not commit
        setErr('Enter a valid number')
        setInternalValue(v => ({ ...v, value: newValue as any }))
        return
      }
    }

    const updatedValue = {
      ...internalValue,
      value: processedValue
    }
    
    setInternalValue(updatedValue)
    onChange(updatedValue)
  }, [internalValue, onChange, min, max, allowDecimals])

  const handleUnitChange = useCallback((newUnit: string) => {
    const updatedValue = {
      ...internalValue,
      unit: newUnit
    }
    
    setInternalValue(updatedValue)
    onChange(updatedValue)
  }, [internalValue, onChange])

  const inputProps = {
    type: allowDecimals ? "number" : "text",
    pattern: allowDecimals ? undefined : "[0-9]*",
    inputMode: allowDecimals ? "decimal" : "numeric"
  } as const

  const validateBlur = () => {
    const val = internalValue.value
    if (val === '' || typeof val === 'number') { setErr(''); return }
    setErr('Enter a valid number')
  }

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <div className="flex-1 min-w-[6rem]">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          id={id}
          {...inputProps}
          value={internalValue.value}
          ref={inputRef}
          onChange={(e) => { setErr(''); handleValueChange(e.target.value) }}
          onBlur={validateBlur}
          className={`block w-full px-2 py-1.5 border rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${err ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
        />
        {err && <div className="text-[10px] text-red-600 mt-0.5">{err}</div>}
      </div>
      {/* Unit: render select for multiple options; render a compact badge for single unit */}
      <div className="flex-shrink-0">
        {units.length > 1 ? (
          <div>
            {label && <div className="block text-xs font-medium text-transparent mb-1">Unit</div>}
            <select
              value={internalValue.unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="block w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={disabled}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            {label && <div className="block text-xs font-medium text-transparent mb-1">Unit</div>}
            <span className="inline-block px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 w-12 text-center">
              {internalValue.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default NumericWithUnits
