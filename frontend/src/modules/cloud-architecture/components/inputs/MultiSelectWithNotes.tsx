import React, { useCallback, useEffect, useMemo, useState } from 'react'

export interface MultiSelectWithNotesValue {
  selections: string[]
  notes: string
}

interface MultiSelectWithNotesProps {
  id: string
  options: string[]
  value?: any
  onChange: (value: MultiSelectWithNotesValue) => void
  className?: string
  notesLabel?: string
  notesPlaceholder?: string
}

const normalizeTokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const MultiSelectWithNotes: React.FC<MultiSelectWithNotesProps> = ({
  id,
  options,
  value,
  onChange,
  className = '',
  notesLabel = 'Notes',
  notesPlaceholder,
}) => {
  const optionTokens = useMemo(() => (
    options.map(opt => ({
      label: opt,
      token: normalizeTokens(opt),
    }))
  ), [options])

  const normalizeValue = useCallback((raw: any): MultiSelectWithNotesValue => {
    if (!raw) return { selections: [], notes: '' }
    if (Array.isArray(raw)) {
      return { selections: raw.filter(Boolean), notes: '' }
    }
    if (typeof raw === 'object') {
      const selections = Array.isArray(raw.selections) ? raw.selections.filter(Boolean) : []
      const notes = typeof raw.notes === 'string' ? raw.notes : ''
      return { selections, notes }
    }
    if (typeof raw === 'string') {
      const notes = raw
      const tokenised = normalizeTokens(raw)
      const inferred = optionTokens
        .filter(opt => opt.token !== '' && tokenised.includes(opt.token))
        .map(opt => opt.label)
      return { selections: inferred, notes }
    }
    return { selections: [], notes: '' }
  }, [optionTokens])

  const [internal, setInternal] = useState<MultiSelectWithNotesValue>(normalizeValue(value))

  useEffect(() => {
    setInternal(normalizeValue(value))
  }, [value, normalizeValue])

  const emit = (next: MultiSelectWithNotesValue) => {
    setInternal(next)
    onChange(next)
  }

  const toggleSelection = (option: string) => {
    const selections = internal.selections.includes(option)
      ? internal.selections.filter(o => o !== option)
      : [...internal.selections, option]
    emit({ selections, notes: internal.notes })
  }

  const updateNotes = (notes: string) => {
    emit({ selections: internal.selections, notes })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        {optionTokens.map(({ label }) => (
          <label key={label} className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 text-azure-blue-600 border-gray-300 rounded focus:ring-azure-blue-500"
              checked={internal.selections.includes(label)}
              onChange={() => toggleSelection(label)}
            />
            <span>{label}</span>
          </label>
        ))}
        {options.length === 0 && (
          <div className="text-xs text-gray-500">No options configured.</div>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className="block text-xs font-medium text-gray-700 mb-1">{notesLabel}</label>
        <textarea
          id={`${id}-notes`}
          value={internal.notes}
          onChange={(e) => updateNotes(e.target.value)}
          rows={3}
          placeholder={notesPlaceholder || 'Add nuance, edge cases, or protocols'}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
        />
      </div>
    </div>
  )
}

export default MultiSelectWithNotes
