import React, { useState, useEffect, useCallback } from 'react'
import NumericWithUnits from './NumericWithUnits'

export interface ConditionalRule {
  triggerField: string
  triggerValue: string | string[]
  action: 'show' | 'hide' | 'enable' | 'disable' | 'setValue' | 'setOptions'
  targetField: string
  value?: any
  options?: string[]
}

export interface ConditionalField {
  id: string
  type: 'text' | 'select' | 'numeric-with-units' | 'multiselect'
  label: string
  placeholder?: string
  options?: string[]
  units?: string[]
  defaultUnit?: string
  defaultValue?: any
  required?: boolean
  disabled?: boolean
  visible?: boolean
  helpText?: string
  min?: number
  max?: number
  allowDecimals?: boolean
}

export interface ConditionalFieldSetProps {
  id: string
  fields: ConditionalField[]
  rules: ConditionalRule[]
  values: Record<string, any>
  onChange: (fieldId: string, value: any) => void
  className?: string
  layout?: 'stack' | 'inline'
}

const ConditionalFieldSet: React.FC<ConditionalFieldSetProps> = ({
  id,
  fields,
  rules,
  values,
  onChange,
  className = "",
  layout = 'stack'
}) => {
  const [fieldStates, setFieldStates] = useState<Record<string, ConditionalField>>(() => {
    return fields.reduce((acc, field) => {
      acc[field.id] = { ...field }
      return acc
    }, {} as Record<string, ConditionalField>)
  })

  // Apply conditional rules when values change
  useEffect(() => {
    setFieldStates(prevStates => {
      const newStates = { ...prevStates }
      
      // Reset all fields to their base state
      fields.forEach(field => {
        newStates[field.id] = { ...field }
      })
      
      // Apply rules based on current values
      rules.forEach(rule => {
        const triggerValue = values[rule.triggerField]
        const shouldApply = Array.isArray(rule.triggerValue) 
          ? rule.triggerValue.includes(triggerValue)
          : rule.triggerValue === triggerValue
          
        if (shouldApply && newStates[rule.targetField]) {
          switch (rule.action) {
            case 'show':
              newStates[rule.targetField].visible = true
              break
            case 'hide':
              newStates[rule.targetField].visible = false
              break
            case 'enable':
              newStates[rule.targetField].disabled = false
              break
            case 'disable':
              newStates[rule.targetField].disabled = true
              break
            case 'setValue':
              if (values[rule.targetField] !== rule.value) {
                onChange(rule.targetField, rule.value)
              }
              break
            case 'setOptions':
              newStates[rule.targetField].options = rule.options
              break
          }
        }
      })
      
      return newStates
    })
  }, [values, rules, fields, onChange])

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    onChange(fieldId, value)
  }, [onChange])

  const renderField = (field: ConditionalField) => {
    const fieldState = fieldStates[field.id]
    if (fieldState?.visible === false) return null

    const fieldValue = values[field.id] || field.defaultValue || ''
    const fieldId = `${id}-${field.id}`
    const inlineWrap = layout === 'inline'
    const wrapClass = inlineWrap ? 'flex-0' : ''
    const inputWidth = (desired: string) => inlineWrap ? desired : 'w-full'
    const isNotes = (field.id === 'notes' || (field.label || '').toLowerCase().includes('notes'))

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className={`space-y-1 ${inlineWrap && isNotes ? 'basis-full' : wrapClass} ${inputWidth(isNotes ? 'w-full' : 'w-44')}`}>
            <label htmlFor={fieldId} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {isNotes ? (
              <textarea
                id={fieldId}
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
                placeholder={field.placeholder || 'Notes (optional)'}
                disabled={fieldState?.disabled}
                rows={3}
              />
            ) : (
              <input
                id={fieldId}
                type="text"
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
                placeholder={field.placeholder}
                disabled={fieldState?.disabled}
              />
            )}
            {field.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className={`space-y-1 ${wrapClass} ${inputWidth(layout === 'inline' ? 'w-auto' : 'w-44')}`}>
            <label htmlFor={fieldId} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={fieldId}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`${layout === 'inline' ? 'inline-block w-auto' : 'block w-full'} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm`}
              disabled={fieldState?.disabled}
            >
              <option value="">Select...</option>
              {(fieldState?.options || field.options)?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        )

      case 'multiselect':
        const currentValues = Array.isArray(fieldValue) ? fieldValue : []
        return (
          <div key={field.id} className={`space-y-1 ${inlineWrap ? 'basis-full' : ''}`}>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(fieldState?.options || field.options)?.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option)
                      handleFieldChange(field.id, newValues)
                    }}
                    className="h-4 w-4 text-azure-blue-600 focus:ring-azure-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded"
                    disabled={fieldState?.disabled}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">{option}</span>
                </label>
              ))}
            </div>
            {field.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        )

      case 'numeric-with-units':
        const isDocSize = inlineWrap && field.id === 'document-size'
        return (
          <div key={field.id} className={`space-y-1 ${isDocSize ? 'basis-full' : wrapClass}`}>
            <NumericWithUnits
              id={fieldId}
              value={fieldValue}
              onChange={(value) => handleFieldChange(field.id, value)}
              units={field.units || ['units']}
              defaultUnit={field.defaultUnit}
              label={field.label}
              placeholder={field.placeholder}
              disabled={fieldState?.disabled}
              min={field.min}
              max={field.max}
              allowDecimals={field.allowDecimals}
              className={inlineWrap ? (isDocSize ? 'w-full' : 'w-44') : ''}
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (layout === 'inline') {
    return (
      <div className={`flex flex-wrap items-end gap-2 ${className}`}>
        {fields.map(renderField)}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {fields.map(renderField)}
    </div>
  )
}

export default ConditionalFieldSet
