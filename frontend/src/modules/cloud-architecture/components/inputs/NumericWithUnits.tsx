import React, { useState, useEffect, useCallback } from 'react'

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

  return (
    <div className={`flex space-x-2 ${className}`}>
      <div className="flex-1">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          id={id}
          {...inputProps}
          value={internalValue.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
        />
      </div>
      
      <div className="flex-shrink-0" style={{ minWidth: '80px' }}>
        {label && (
          <div className="block text-xs font-medium text-transparent mb-1">Unit</div>
        )}
        <select
          value={internalValue.unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
          disabled={disabled}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default NumericWithUnits