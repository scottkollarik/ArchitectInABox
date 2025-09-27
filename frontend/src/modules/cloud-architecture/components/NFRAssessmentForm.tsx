import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { nfrSections, getSectionCompletion, getOverallCompletion } from '../data/nfrData'
import type { NFRSection, NFRQuestion, NFRFieldLock } from '../types'
import { useProject } from '../../../context/ProjectContext'
import NumericWithUnits from './inputs/NumericWithUnits'
import PercentageSplit from './inputs/PercentageSplit'
import LatencyTargets from './inputs/LatencyTargets'
import ConditionalFieldSet from './inputs/ConditionalFieldSet'
import AzureRegionSelector from './inputs/AzureRegionSelector'
import SizeRange, { type SizeRangeValue } from './inputs/SizeRange'
import AvgPeakRps from './inputs/AvgPeakRps'
import InfoTooltip from './inputs/InfoTooltip'
import ExpectedRpsInput from './inputs/ExpectedRpsInput'
import MultiSelectWithNotes from './inputs/MultiSelectWithNotes'
import { nfrRecipes } from '../data/recipes'
import ToggleSwitch from '../../../components/ToggleSwitch'

// Local helper: numeric-with-units parse for legacy strings
const parseNumericWithUnit = (raw: any, defaultUnit: string) => {
  if (raw && typeof raw === 'object' && ('value' in raw || 'unit' in raw)) {
    const val = typeof raw.value === 'number' ? raw.value : (typeof raw.value === 'string' && /^\d+(?:\.\d+)?$/.test(raw.value) ? parseFloat(raw.value) : '')
    return { value: val as any, unit: raw.unit || defaultUnit }
  }
  if (typeof raw === 'string') {
    const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/)
    if (m) return { value: parseFloat(m[1]), unit: m[2] }
  }
  return { value: '', unit: defaultUnit }
}

// Compute the best target id for the section/question label to reference
const getQuestionLabelTargetId = (sectionId: string, question: NFRQuestion): string | undefined => {
  const base = `${sectionId}-${question.id}`
  switch (question.inputType) {
    case 'subheading':
      return undefined
    case 'text':
    case 'number':
    case 'select':
    case 'textarea':
    case 'azure-region':
      return base
    case 'percentage-split':
      return `${base}-read`
    case 'latency-targets':
      return `${base}-p95`
    case 'size-range':
      return `${base}-min`
    case 'compound':
      if (question.id === 'peak-vs-average') return `${base}-average-rps`
      if (question.id === 'data-growth') return `${base}-growth-amount`
      if (question.compoundFields && question.compoundFields[0]) return `${base}-${question.compoundFields[0].id}`
      return undefined
    case 'card-list':
    case 'multiselect':
    case 'multiselect-with-notes':
    case 'conditional-fieldset':
    default:
      return undefined
  }
}

const NFRAssessmentForm: React.FC = () => {
  const { currentProject, updateProject } = useProject()
  const [sections, setSections] = useState<NFRSection[]>(nfrSections)
  const nfrLocks = (currentProject?.constraints?.nfrLocks || []) as NFRFieldLock[]

  const matchLock = (path: string): NFRFieldLock | undefined => {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const toRegex = (p: string) => new RegExp('^' + esc(p).replace(/\\\\\[\\\\\]/g, '[^.]+' ) + '$')
    // support [] marker: models[].consistency
    const normalized = path
    return nfrLocks.find(l => {
      const pat = l.path.replace(/\[\]/g, '[^.]+' )
      const re = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
      return re.test(normalized)
    })
  }

  // Merge saved NFR with current schema so new input types render while preserving values
  const initializedRef = useRef<string | null>(null)
  useEffect(() => {
    const merge = (saved: NFRSection[] | undefined, defs: NFRSection[]): NFRSection[] => {
      if (!saved || saved.length === 0) return defs
      const byId = new Map(saved.map(s => [s.id, s]))
      const normalizeRequestTypes = (raw: any) => {
        if (!raw) return undefined
        if (Array.isArray(raw)) return { selections: raw.filter(Boolean), notes: '' }
        if (typeof raw === 'object') {
          const selections = Array.isArray(raw.selections) ? raw.selections.filter(Boolean) : []
          const notes = typeof raw.notes === 'string' ? raw.notes : ''
          return { selections, notes }
        }
        if (typeof raw === 'string') return { selections: [], notes: raw }
        return undefined
      }
      return defs.map(def => {
        const s = byId.get(def.id)
        if (!s) return def
        const qById = new Map((s.questions || []).map(q => [q.id, q]))
        const mergedQs = def.questions.map(dq => {
          const sq = qById.get(dq.id) as any
          let useValue = dq.value
          if (sq) {
            if (sq.inputType === dq.inputType) {
              useValue = sq.value
            } else {
              // Migrate legacy text answers into notes for new fieldsets
              if ((dq.id === 'transactions' || dq.id === 'search-analytics') && typeof sq.value === 'string' && dq.inputType === 'conditional-fieldset') {
                useValue = { ...(dq.value || {}), notes: sq.value }
              }
              if (dq.id === 'request-types' && dq.inputType === 'multiselect-with-notes') {
                const normalized = normalizeRequestTypes(sq.value)
                useValue = normalized ?? useValue
              }
            }
          }
          if (dq.id === 'request-types' && dq.inputType === 'multiselect-with-notes') {
            const normalized = normalizeRequestTypes(useValue)
            if (normalized) useValue = normalized
          }
          const isCompleted = typeof sq?.isCompleted === 'boolean' ? sq.isCompleted : dq.isCompleted
          return { ...dq, value: useValue, isCompleted }
        })
        return { ...def, isCollapsed: s.isCollapsed ?? def.isCollapsed, questions: mergedQs }
      })
    }
    const projId = currentProject?.id || 'none'
    if (initializedRef.current === projId) return
    const next = merge(currentProject?.nfrAssessment as NFRSection[] | undefined, nfrSections)
    // Apply recipe defaults non-destructively (only when blank)
    const recipeId = (currentProject?.profile as any)?.recipe as string | undefined
    if (recipeId) {
      const recipe = nfrRecipes.find(r => r.id === recipeId)
      if (recipe) {
        const withDefaults = next.map(section => ({
          ...section,
          questions: section.questions.map(q => {
            const def = recipe.defaults[q.id]
            if (def === undefined || def === null) return q
            if (q.value !== undefined && q.value !== '' && q.isCompleted) return q
            // For conditional-fieldset, merge objects
            if (q.inputType === 'conditional-fieldset' && typeof def === 'object') {
              return { ...q, value: { ...(q.value || {}), ...def } }
            }
            return { ...q, value: def }
          })
        }))
        setSections(withDefaults)
      } else {
        setSections(next)
      }
    } else {
      setSections(next)
    }
    initializedRef.current = projId
  }, [currentProject?.id])

  // Save NFR data to project when sections change (debounced to prevent rapid saves)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentProject && sections.length > 0) {
        updateProject({
          nfrAssessment: sections
        })
      }
    }, 500) // 500ms debounce
    
    return () => clearTimeout(timer)
  }, [sections]) // Remove currentProject and updateProject from dependencies to break loop

  // Allow external request to open a specific section from summary chips
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sectionId?: string } | undefined
      if (!detail?.sectionId) return
      setSections(prev => prev.map(section =>
        section.id === detail.sectionId ? { ...section, isCollapsed: false } : section
      ))
      const el = document.getElementById(`nfr-${detail.sectionId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('nfr-open-section', handler as EventListener)
    return () => window.removeEventListener('nfr-open-section', handler as EventListener)
  }, [])

  // Demo seed: populate 3 example data sources once per session if none exist yet
  useEffect(() => {
    try {
      if (!sections || sections.length === 0) return
      const key = 'nfr-demo-seed-datasources'
      if (sessionStorage.getItem(key)) return
      const ds = sections.find(s => s.id === 'data-consistency')
      if (!ds) return
      const q = ds.questions.find(q => q.id === 'data-models')
      if (!q) return
      const cards = Array.isArray(q.value) ? q.value : []
      if (cards.length > 0) { sessionStorage.setItem(key, '1'); return }
      const demo = [
        { name: 'User profiles', 'model-type': 'Relational (SQL)', consistency: 'Strong (ACID)', 'size-estimate': '100 GB' },
        { name: 'Activity events', 'model-type': 'Document (NoSQL)', consistency: 'Session', 'size-estimate': '2 TB' },
        { name: 'Media objects', 'model-type': 'Blob/File storage', consistency: 'Eventual', 'size-estimate': '10 TB' },
      ]
      setSections(prev => prev.map(section => section.id !== 'data-consistency' ? section : ({
        ...section,
        questions: section.questions.map(qq => qq.id !== 'data-models' ? qq : ({ ...qq, value: demo, isCompleted: true }))
      })))
      sessionStorage.setItem(key, '1')
    } catch {}
  }, [sections])

  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isCollapsed: !section.isCollapsed }
        : section
    ))
  }, [])

  const computeQuestionCompletion = useCallback((question: NFRQuestion, value: any) => {
    switch (question.inputType) {
      case 'multiselect':
        return Array.isArray(value) && value.length > 0
      case 'multiselect-with-notes': {
        if (!value) return false
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'object') {
          const selections = Array.isArray(value.selections) ? value.selections.filter(Boolean) : []
          const notes = typeof value.notes === 'string' ? value.notes.trim() : ''
          return selections.length > 0 || notes.length > 0
        }
        if (typeof value === 'string') return value.trim().length > 0
        return false
      }
      case 'latency-targets': {
        if (!value) return false
        const has95 = (typeof value.p95 === 'number' && !isNaN(value.p95)) || (typeof value.p95 === 'string' && value.p95.trim() !== '')
        const has99 = (typeof value.p99 === 'number' && !isNaN(value.p99)) || (typeof value.p99 === 'string' && value.p99.trim() !== '')
        return has95 || has99
      }
      default:
        return value !== undefined && value !== null && value !== ''
    }
  }, [])

  const updateQuestion = useCallback((sectionId: string, questionId: string, value: any) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? { ...question, value, isCompleted: computeQuestionCompletion(question, value) }
                : question
            )
          }
        : section
    ))
  }, [computeQuestionCompletion])

  const updateCompoundField = useCallback((sectionId: string, questionId: string, fieldId: string, value: any) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? { 
                    ...question, 
                    value: { 
                      ...(question.value || {}), 
                      [fieldId]: value 
                    },
                    isCompleted: checkCompoundCompletion(question, { ...(question.value || {}), [fieldId]: value })
                  }
                : question
            )
          }
        : section
    ))
  }, [])

  // Helpers for big number text fields (e.g., Avg/Peak RPS)
  const decommify = (s: string) => s.replace(/,/g, '')
  const commify = (s: string) => {
    const raw = decommify(s)
    if (!raw) return ''
    const n = parseInt(raw, 10)
    return isNaN(n) ? s : n.toLocaleString('en-US')
  }

  const checkCompoundCompletion = useCallback((question: NFRQuestion, value: any) => {
    if (!question.compoundFields) return false
    return question.compoundFields.every(field => 
      value && value[field.id] && value[field.id] !== ''
    )
  }, [])

  const addCard = useCallback((sectionId: string, questionId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? {
                    ...question,
                    value: [
                      ...(Array.isArray(question.value) ? question.value : []),
                      {} // Empty card object
                    ],
                    isCompleted: true // Having at least one card counts as started
                  }
                : question
            )
          }
        : section
    ))
  }, [])

  const removeCard = useCallback((sectionId: string, questionId: string, cardIndex: number) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? {
                    ...question,
                    value: Array.isArray(question.value) 
                      ? question.value.filter((_, index) => index !== cardIndex)
                      : [],
                    isCompleted: Array.isArray(question.value) && question.value.length > 1
                  }
                : question
            )
          }
        : section
    ))
  }, [])

  const updateCardField = useCallback((sectionId: string, questionId: string, cardIndex: number, fieldId: string, value: any) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? {
                    ...question,
                    value: Array.isArray(question.value)
                      ? question.value.map((card, index) =>
                          index === cardIndex
                            ? { ...card, [fieldId]: value }
                            : card
                        )
                      : [{ [fieldId]: value }]
                  }
                : question
            )
          }
        : section
    ))
  }, [])

  // Inline component for card-list with composer UX
  const CardListComposer: React.FC<{
    sectionId: string
    questionId: string
    inputId: string
    cards: any[]
    fields: any[]
    addButtonText?: string
    cardTitle?: string
    maxCards: number
    defaults?: Record<string, any>
  }> = ({ sectionId, questionId, inputId, cards, fields, addButtonText, cardTitle, maxCards, defaults = {} }) => {
    const getNumericDefault = React.useCallback((field: any) => ({
      value: '',
      unit: field.defaultUnit || (field.units?.[0] || 'GB')
    }), [])

    const getFieldDefault = React.useCallback((field: any) => {
      if (field.type === 'numeric-with-units') return getNumericDefault(field)
      if (defaults[field.id] !== undefined) return defaults[field.id]
      if (field.defaultValue !== undefined) return field.defaultValue
      return ''
    }, [defaults, getNumericDefault])

    const [draft, setDraft] = React.useState<Record<string, any>>(() => {
      const init: Record<string, any> = {}
      fields.forEach((f: any) => {
        init[f.id] = getFieldDefault(f)
      })
      return init
    })
    const [expandedCards, setExpandedCards] = React.useState<Record<number, boolean>>({})

    const datasetOriginDefault = React.useMemo(
      () => fields.find((f: any) => f.id === 'dataset-origin')?.defaultValue,
      [fields]
    )

    const sizeFieldConfig = React.useMemo(
      () => fields.find((f: any) => f.id === 'size-estimate'),
      [fields]
    )

    const resolveConditionalValue = React.useCallback((fieldId: string, values: Record<string, any>) => {
      if (!values) return undefined
      const direct = values[fieldId]
      if (direct !== undefined && direct !== '') return direct
      const controlling = fields.find((f: any) => f.id === fieldId)
      if (!controlling) return direct
      if (controlling.type === 'numeric-with-units') return direct
      if (controlling.defaultValue !== undefined) return controlling.defaultValue
      return direct
    }, [fields])

    const shouldRenderField = React.useCallback((field: any, values: Record<string, any>) => {
      if (!field.showWhen) return true
      const compareValue = resolveConditionalValue(field.showWhen.field, values)
      if (field.showWhen.equals !== undefined) return compareValue === field.showWhen.equals
      if (field.showWhen.notEquals !== undefined) return compareValue !== field.showWhen.notEquals
      if (field.showWhen.values) return field.showWhen.values.includes(compareValue)
      if (field.showWhen.notValues) return !field.showWhen.notValues.includes(compareValue)
      return true
    }, [resolveConditionalValue])

    const handleSelectChange = React.useCallback((field: any, cardIdx: number, value: string) => {
      updateCardField(sectionId, questionId, cardIdx, field.id, value)
      if (field.id === 'dataset-origin' && datasetOriginDefault && value === datasetOriginDefault && sizeFieldConfig) {
        updateCardField(sectionId, questionId, cardIdx, 'size-estimate', getNumericDefault(sizeFieldConfig))
      }
    }, [datasetOriginDefault, getNumericDefault, questionId, sectionId, sizeFieldConfig, updateCardField])

    React.useEffect(() => {
      setExpandedCards(prev => {
        const next: Record<number, boolean> = {}
        cards.forEach((_, index) => {
          next[index] = prev[index] ?? false
        })
        return next
      })
    }, [cards])

    React.useEffect(() => {
      const datasetOriginField = fields.find((f: any) => f.id === 'dataset-origin')
      const sizeField = sizeFieldConfig

      cards.forEach((card, index) => {
        if (!card) return
        const currentOrigin = card['dataset-origin']
        const sizeVal = card['size-estimate']
        const hasSizeValue = (() => {
          if (!sizeVal) return false
          if (typeof sizeVal === 'object') {
            const value = sizeVal.value
            if (value === undefined || value === null) return false
            if (typeof value === 'string') return value.trim() !== ''
            return value !== ''
          }
          if (typeof sizeVal === 'string') return sizeVal.trim() !== ''
          return true
        })()

        if (!currentOrigin && datasetOriginField) {
          const inferredOrigin = hasSizeValue ? 'Migrating existing workload' : datasetOriginField.defaultValue
          if (inferredOrigin) {
            updateCardField(sectionId, questionId, index, 'dataset-origin', inferredOrigin)
            return
          }
        }

        const effectiveOrigin = currentOrigin || (hasSizeValue ? 'Migrating existing workload' : datasetOriginField?.defaultValue)
        if (effectiveOrigin === datasetOriginField?.defaultValue && hasSizeValue && sizeField) {
          updateCardField(sectionId, questionId, index, 'size-estimate', getNumericDefault(sizeField))
        }
      })
    }, [cards, fields, getNumericDefault, questionId, sectionId, sizeFieldConfig, updateCardField])

    const setDraftField = (id: string, val: any) => {
      if (id === 'dataset-origin' && datasetOriginDefault && val === datasetOriginDefault) {
        const sizeDefault = sizeFieldConfig ? getNumericDefault(sizeFieldConfig) : undefined
        setDraft(prev => ({
          ...prev,
          [id]: val,
          ...(sizeDefault ? { 'size-estimate': sizeDefault } : {})
        }))
        return
      }
      setDraft(prev => ({ ...prev, [id]: val }))
    }

    const handleAdd = () => {
      const newCard: Record<string, any> = {}
      fields.forEach((f: any) => {
        const val = draft[f.id]
        newCard[f.id] = f.type === 'numeric-with-units' && val ? { ...val } : val
      })
      setSections(prev => prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map(q =>
                q.id === questionId
                  ? { ...q, value: [...(Array.isArray(q.value) ? q.value : []), newCard], isCompleted: true }
                  : q
              )
            }
          : section
      ))
      // reset draft
      const reset: Record<string, any> = {}
      fields.forEach((f: any) => {
        reset[f.id] = getFieldDefault(f)
      })
      setDraft(reset)
    }

    const formatSizeEstimate = (val: any, origin?: string) => {
      const defaultGreenfield = datasetOriginDefault || 'Greenfield (0 existing data)'
      if (origin && origin === defaultGreenfield) return 'No existing data'
      if (!val) return 'Size unknown'
      if (typeof val === 'object') {
        const rawValue = val.value
        const hasValue =
          rawValue !== undefined &&
          rawValue !== null &&
          !(typeof rawValue === 'string' && rawValue.trim() === '')
        if (!hasValue) return 'Size unknown'
        const unit = val.unit || ''
        return `${rawValue} ${unit}`.trim()
      }
      return String(val)
    }

    const toggleCard = (index: number) => {
      setExpandedCards(prev => ({ ...prev, [index]: !(prev[index] ?? false) }))
    }

    return (
      <div className="mt-1 space-y-4">
        {/* Existing Cards */}
        {cards.map((card, cardIndex) => {
          const datasetOrigin = card?.['dataset-origin'] ?? datasetOriginDefault
          return (
            <div
              key={cardIndex}
              className="relative border border-indigo-100 dark:border-indigo-700/60 rounded-xl bg-indigo-50/80 dark:bg-indigo-900/40 shadow-sm overflow-hidden transition-colors"
            >
            <button
              type="button"
              onClick={() => toggleCard(cardIndex)}
              className="relative flex w-full items-stretch pl-10 pr-4 py-3"
              aria-expanded={expandedCards[cardIndex] ?? false}
            >
              <span className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-8 bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wide">
                {cardIndex + 1}
              </span>
              <div className="flex flex-1 items-center justify-between gap-3 text-left">
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {card.name || `${cardTitle || 'Item'} ${cardIndex + 1}`}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-architect-gray-600 dark:text-gray-300">
                    <span>Model: {card['model-type'] || 'Not set'}</span>
                    <span>Context: {datasetOrigin || 'Not set'}</span>
                    <span>Consistency: {card.consistency || '—'}</span>
                    <span>Existing data: {formatSizeEstimate(card['size-estimate'], datasetOrigin)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedCards(prev => {
                        const next = { ...prev }
                        delete next[cardIndex]
                        return next
                      })
                      removeCard(sectionId, questionId, cardIndex)
                    }}
                    className="text-red-500 hover:text-red-600 text-xs font-medium flex items-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </button>
                  <ChevronDownIcon className={`h-4 w-4 text-architect-gray-500 dark:text-gray-400 transition-transform ${expandedCards[cardIndex] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>

            {(expandedCards[cardIndex] ?? false) && (
              <div className="border-t border-indigo-100 dark:border-indigo-700/60 px-4 py-4 bg-white/90 dark:bg-gray-900/70">
                <div className="grid grid-cols-1 gap-3">
                  {fields.map((field: any) => {
                    if (!shouldRenderField(field, card)) return null
                    const rawFieldValue = card[field.id]
                    const fieldValue = rawFieldValue !== undefined ? rawFieldValue : getFieldDefault(field)
                    const cardFieldInputId = `${inputId}-card-${cardIndex}-${field.id}`
                    const path = (field.id === 'consistency') ? `data.models.${cardIndex}.consistency` : ''
                    const lock = path ? matchLock(path) : undefined
                    const options = (field.options || []).filter((o: string) => !lock || lock.mode !== 'policy-only' || !lock.allowedValues?.length || lock.allowedValues.includes(o))
                    return (
                      <div key={field.id}>
                        <label htmlFor={cardFieldInputId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                        {field.type === 'select' ? (
                      <select
                        id={cardFieldInputId}
                        value={(fieldValue ?? '') as string}
                        onChange={(e) => handleSelectChange(field, cardIndex, e.target.value)}
                        className="inline-block max-w-xs px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={!!lock && lock.mode === 'locked'}
                      >
                        <option value="">Select...</option>
                        {options.map((option: string) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'numeric-with-units' ? (
                      <NumericWithUnits
                        id={cardFieldInputId}
                        value={parseNumericWithUnit(fieldValue, field.defaultUnit || (field.units?.[0] || 'GB'))}
                        onChange={(val) => updateCardField(sectionId, questionId, cardIndex, field.id, val)}
                        units={field.units || ['units']}
                        defaultUnit={field.defaultUnit}
                        inputWidthClass={field.id === 'size-estimate' ? 'w-28' : undefined}
                        unitWidthClass={field.id === 'size-estimate' ? 'w-16' : undefined}
                      />
                    ) : (
                      <input
                        id={cardFieldInputId}
                        type={field.type}
                        value={(fieldValue ?? '') as string}
                        onChange={(e) => updateCardField(sectionId, questionId, cardIndex, field.id, e.target.value)}
                        className="block max-w-xs px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                )
              })}
                </div>
              </div>
            )}
            </div>
          )
        })}

        {/* Composer for new card */}
        {cards.length < maxCards ? (
          <div className="border border-dashed border-indigo-200 dark:border-indigo-700/50 rounded-xl p-4 bg-indigo-50/40 dark:bg-indigo-900/20 transition-colors">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{cardTitle || 'Item'} (new)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field: any) => {
                if (!shouldRenderField(field, draft)) return null
                const fieldId = `${inputId}-composer-${field.id}`
                const currentVal = draft[field.id]
                const val = currentVal !== undefined ? currentVal : getFieldDefault(field)
                const path = (field.id === 'consistency') ? `data.models.new.consistency` : ''
                const lock = path ? matchLock(path) : undefined
                const options = (field.options || []).filter((o: string) => !lock || lock.mode !== 'policy-only' || !lock.allowedValues?.length || lock.allowedValues.includes(o))
                return (
                  <div key={field.id}>
                    <label htmlFor={fieldId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        id={fieldId}
                        value={(val ?? '') as string}
                        onChange={(e) => setDraftField(field.id, e.target.value)}
                        className="inline-block max-w-xs px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={!!lock && lock.mode === 'locked'}
                      >
                        <option value="">Select...</option>
                        {options.map((option: string) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'numeric-with-units' ? (
                      <NumericWithUnits
                        id={fieldId}
                        value={typeof val === 'object' ? val : getFieldDefault(field)}
                        onChange={(v) => setDraftField(field.id, v)}
                        units={field.units || ['units']}
                        defaultUnit={field.defaultUnit}
                        inputWidthClass={field.id === 'size-estimate' ? 'w-28' : undefined}
                        unitWidthClass={field.id === 'size-estimate' ? 'w-16' : undefined}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        type={field.type}
                        value={(val ?? '') as string}
                        onChange={(e) => setDraftField(field.id, e.target.value)}
                        className="block max-w-xs px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3">
              <button type="button" onClick={handleAdd} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-azure-blue-600 dark:bg-azure-blue-700 text-white hover:bg-azure-blue-700 dark:hover:bg-azure-blue-800">
                {addButtonText || 'Add Item'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Maximum {maxCards} items reached</p>
        )}
      </div>
    )
  }


  const renderQuestion = (sectionId: string, question: NFRQuestion) => {
    const inputId = `${sectionId}-${question.id}`

    switch (question.inputType) {
      case 'subheading':
        return null
      case 'size-range': {
        const v = (question.value || {}) as any
        const minUnit = (v.minUnit || v.unit || 'KB') as any
        const maxUnit = (v.maxUnit || v.unit || 'KB') as any
        const norm: SizeRangeValue = {
          min: typeof v.min === 'number' ? v.min : '',
          max: typeof v.max === 'number' ? v.max : '',
          minUnit,
          maxUnit,
          // keep legacy `unit` only when min/max match
          unit: minUnit === maxUnit ? (minUnit as any) : undefined,
        }
        return (
          <div className="mt-1">
            <SizeRange id={inputId} value={norm} onChange={(val)=>updateQuestion(sectionId, question.id, val)} />
          </div>
        )
      }
      case 'textarea':
        return (
          <textarea
            id={inputId}
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={3}
            placeholder={question.placeholder}
          />
        )
      case 'percentage-split':
        return (
          <PercentageSplit
            id={inputId}
            value={question.value || { read: 50, write: 50 }}
            onChange={(val) => updateQuestion(sectionId, question.id, val)}
            className="mt-1"
            mode={question.id === 'read-write-ratio' ? 'slider' : 'inputs'}
          />
        )

      case 'latency-targets':
        return (
          <LatencyTargets
            id={inputId}
            value={question.value}
            onChange={(val) => updateQuestion(sectionId, question.id, val)}
            className="mt-1"
          />
        )
      case 'text':
        if (question.id === 'expected-rps') {
          return (
            <ExpectedRpsInput
              id={inputId}
              value={question.value}
              onChange={(val) => updateQuestion(sectionId, question.id, val)}
              className="mt-1"
            />
          )
        }
        return (
          <input
            id={inputId}
            type="text"
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm max-w-xs"
            placeholder={question.placeholder}
          />
        )

      case 'number':
        return (
          <input
            id={inputId}
            type="number"
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm max-w-xs"
            placeholder={question.placeholder}
          />
        )

      case 'select': {
        // Apply blueprint locks only for known paths
        let lock: NFRFieldLock | undefined
        if (question.id === 'consistency-level') lock = matchLock('data.consistency-level')
        const opts = (question.options || []).filter(o => !lock || lock.mode !== 'policy-only' || !lock.allowedValues || lock.allowedValues.includes(o))
        return (
          <select
            id={inputId}
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 inline-block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm max-w-xs"
            disabled={!!lock && lock.mode === 'locked'}
          >
            <option value="">Select an option...</option>
            {opts.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      }

      case 'multiselect':
        return (
          <div className="mt-1 space-y-2">
            {question.options?.map((option) => {
              const currentValues = Array.isArray(question.value) ? question.value : []
              const isSelected = currentValues.includes(option)
              const toggle = () => {
                const newValues = isSelected
                  ? currentValues.filter(v => v !== option)
                  : [...currentValues, option]
                updateQuestion(sectionId, question.id, newValues)
              }
              return (
                <div key={option} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <ToggleSwitch
                    size="sm"
                    checked={isSelected}
                    onChange={toggle}
                    ariaLabel={`Toggle ${option}`}
                  />
                  <span className="cursor-pointer select-none" onClick={toggle}>{option}</span>
                </div>
              )
            })}
          </div>
        )

      case 'multiselect-with-notes': {
        const options = question.options || []
        return (
          <MultiSelectWithNotes
            id={inputId}
            options={options}
            value={question.value}
            onChange={(val) => updateQuestion(sectionId, question.id, val)}
            notesPlaceholder={question.notesPlaceholder || question.placeholder}
            className="mt-1"
          />
        )
      }

      case 'compound':
        // Compact layout with validation for Avg/Peak RPS
        if (question.id === 'peak-vs-average') {
          const onFieldChange = (fid: 'average-rps'|'peak-rps', v: string) => updateCompoundField(sectionId, question.id, fid, v)
          return (
            <AvgPeakRps id={inputId} value={question.value} onChange={onFieldChange} className="mt-1" />
          )
        }
        // Special compact layout for data growth + retention: single line, tighter controls
        if (question.id === 'data-growth') {
          const widthFor = (id: string) => (
            id.includes('amount') ? 'w-24' : 'w-32'
          )
          return (
            <div className="mt-1">
              <div className="flex flex-wrap items-end gap-2">
                {question.compoundFields?.map((field) => {
                  const fieldValue = question.value?.[field.id] || ''
                  const fieldInputId = `${inputId}-${field.id}`
                  const w = widthFor(field.id)
                  return (
                    <div key={field.id} className={w}>
                      <label htmlFor={fieldInputId} className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={fieldInputId}
                          value={fieldValue}
                          onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                        className="block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={fieldInputId}
                          type={field.type}
                          value={fieldValue}
                          onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                        className="block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
        if (question.id === 'item-size') {
          // Render as SizeRange instead of four separate fields
          const v: any = question.value || {}
          const norm: SizeRangeValue = {
            min: typeof v['average-size'] === 'number' ? v['average-size'] : v.min ?? '',
            max: typeof v['max-size'] === 'number' ? v['max-size'] : v.max ?? '',
            unit: (v['max-unit'] || v['average-unit'] || v.unit || 'KB') as any,
          }
          return (
            <div className="mt-0.5">
              <SizeRange id={inputId} value={norm} onChange={(val)=>updateQuestion(sectionId, question.id, val)} />
            </div>
          )
        }
        // Default compound layout
        return (
          <div className="mt-1">
            <div className="flex flex-wrap gap-3">
              {question.compoundFields?.map((field) => {
                const fieldValue = question.value?.[field.id] || ''
                const fieldInputId = `${inputId}-${field.id}`
                const slimFields = ['min-instances', 'max-instances', 'scale-threshold']
                const mediumFields = ['scale-signal']
                const slim = slimFields.includes(field.id)
                const medium = mediumFields.includes(field.id)
                const widthClass = slim ? 'max-w-[9rem]' : medium ? 'max-w-[12rem]' : ''
                return (
                  <div key={field.id} className={`${widthClass} flex-1 min-w-[9rem] max-w-xs`}>
                    <label htmlFor={fieldInputId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                      {field.suffix && <span className="text-gray-500 dark:text-gray-400 ml-1">({field.suffix})</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={fieldInputId}
                        value={fieldValue}
                        onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                        className={`block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm ${slim ? 'pr-6' : ''}`}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={fieldInputId}
                        type={field.type}
                        value={fieldValue}
                        onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                        className="block w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'card-list':
        // Backward-compatible normalization: accept arrays located under common keys
        const rawCards: any = question.value
        const cards = Array.isArray(rawCards)
          ? rawCards
          : (Array.isArray(rawCards?.items) ? rawCards.items : (Array.isArray(rawCards?.cards) ? rawCards.cards : []))
        const maxCards = question.cardConfig?.maxCards || 10
        const parentSection = sections.find(s => s.id === sectionId)
        const globalConsistency = parentSection?.questions.find(q => q.id === 'consistency-level')?.value

        return (
          <CardListComposer
            sectionId={sectionId}
            questionId={question.id}
            inputId={inputId}
            cards={cards}
            fields={question.cardConfig?.fields || []}
            addButtonText={question.cardConfig?.addButtonText}
            cardTitle={question.cardConfig?.cardTitle}
            maxCards={maxCards}
            defaults={{ consistency: globalConsistency }}
          />
        )

      case 'numeric-with-units':
        return (
          <NumericWithUnits
            id={inputId}
            value={question.value}
            onChange={(value) => updateQuestion(sectionId, question.id, value)}
            units={question.units || ['units']}
            defaultUnit={question.defaultUnit}
            placeholder={question.placeholder}
            min={question.min}
            max={question.max}
            allowDecimals={question.allowDecimals}
            className="mt-1"
          />
        )

      case 'conditional-fieldset':
        return (
          <ConditionalFieldSet
            id={inputId}
            fields={question.conditionalFields || []}
            rules={question.conditionalRules || []}
            values={question.value || {}}
            onChange={(fieldId, value) => {
              const currentValues = question.value || {}
              const newValues = { ...currentValues, [fieldId]: value }
              updateQuestion(sectionId, question.id, newValues)
            }}
            className="mt-1"
            layout={(question.id === 'transactions' || question.id === 'search-analytics' || question.id === 'data-storage-config') ? 'inline' : 'stack'}
          />
        )

      case 'azure-region':
        return (
          <AzureRegionSelector
            id={inputId}
            value={question.value}
            onChange={(value) => updateQuestion(sectionId, question.id, value)}
            className="mt-1"
          />
        )

      default:
        return (
          <input
            id={inputId}
            type="text"
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={question.placeholder}
          />
        )
    }
  }

  const overallCompletion = getOverallCompletion(sections)
  const overallPercentage = overallCompletion.requiredQuestions.percentage

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Overall Progress</h3>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{overallPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </div>

      {/* NFR Sections */}
      {sections.map((section) => {
        const completion = getSectionCompletion(section)
        const isCompleted = completion.isComplete
        const hasAnswers = completion.required.completed > 0 || completion.optional.completed > 0

        return (
          <div key={section.id} id={`nfr-${section.id}`} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                {section.isCollapsed ? (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    {section.icon && <span className="text-base" aria-hidden>{section.icon}</span>}
                    <h3 className="font-medium text-gray-900 dark:text-white">{section.title}</h3>
                    {(() => {
                      const reqTotal = section.questions.filter(q => q.isRequired).length
                      const reqDone = section.questions.filter(q => q.isRequired && q.isCompleted).length
                      const optTotal = section.questions.filter(q => q.isOptional).length
                      const optDone = section.questions.filter(q => q.isOptional && q.isCompleted).length
                      return (
                        <>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 dark:border-gray-600 text-architect-gray-700 dark:text-gray-300" title="Required questions completed">
                            Req {reqDone}/{reqTotal}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 dark:border-gray-600 text-architect-gray-700 dark:text-gray-300" title="Optional questions answered">
                            Opt {optDone}/{optTotal}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {(() => {
                  const pct = Math.round((completion.required.completed / (completion.required.total || 1)) * 100) || 0
                  // Alternate mapping: 0 red, 1–33 red, 34–66 amber, 67–99 light‑green, 100 green
                  const colorClasses = pct === 100
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600'
                    : pct >= 67
                      ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600'
                      : pct >= 34
                        ? 'bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600'
                        : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600'
                  return (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClasses}`}>{pct}%</span>
                  )
                })()}
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : hasAnswers ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <InformationCircleIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Section Content */}
            {!section.isCollapsed && (
              <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                {section.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    {(() => {
                      const forId = getQuestionLabelTargetId(section.id, question)
                      const modelCount = question.id === 'data-models' && Array.isArray(question.value) ? question.value.length : 0
                      const countBadge = question.id === 'data-models' ? (
                        <span className="inline-flex items-center justify-center rounded-full border border-architect-gray-200 dark:border-gray-600 bg-architect-gray-100/70 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] text-architect-gray-700 dark:text-gray-200">
                          {modelCount}
                        </span>
                      ) : null
                      const title = (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {question.text}
                            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          {countBadge}
                          {question.infoPopover ? (
                            <InfoTooltip
                              title={question.infoPopover.title}
                              description={question.infoPopover.description}
                              bullets={question.infoPopover.bullets}
                            />
                          ) : null}
                        </span>
                      )
                      const helper = question.helpText ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{question.helpText}</p>
                      ) : null
                      return forId ? (
                        <label htmlFor={forId} className="block">
                          {title}
                          {helper}
                        </label>
                      ) : (
                        <div className="block">
                          {title}
                          {helper}
                        </div>
                      )
                    })()}
                    {renderQuestion(section.id, question)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default NFRAssessmentForm
