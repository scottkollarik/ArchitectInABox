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
import type { NFRSection, NFRQuestion } from '../types'
import { useProject } from '../../../context/ProjectContext'
import NumericWithUnits from './inputs/NumericWithUnits'
import PercentageSplit from './inputs/PercentageSplit'
import LatencyTargets from './inputs/LatencyTargets'
import ConditionalFieldSet from './inputs/ConditionalFieldSet'
import AzureRegionSelector from './inputs/AzureRegionSelector'
import SizeRange, { type SizeRangeValue } from './inputs/SizeRange'
import AvgPeakRps from './inputs/AvgPeakRps'

// Compute the best target id for the section/question label to reference
const getQuestionLabelTargetId = (sectionId: string, question: NFRQuestion): string | undefined => {
  const base = `${sectionId}-${question.id}`
  switch (question.inputType) {
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
    case 'conditional-fieldset':
    default:
      return undefined
  }
}

const NFRAssessmentForm: React.FC = () => {
  const { currentProject, updateProject } = useProject()
  const [sections, setSections] = useState<NFRSection[]>(nfrSections)

  // Merge saved NFR with current schema so new input types render while preserving values
  const initializedRef = useRef<string | null>(null)
  useEffect(() => {
    const merge = (saved: NFRSection[] | undefined, defs: NFRSection[]): NFRSection[] => {
      if (!saved || saved.length === 0) return defs
      const byId = new Map(saved.map(s => [s.id, s]))
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
            }
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
    setSections(next)
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

  const updateQuestion = useCallback((sectionId: string, questionId: string, value: any) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? {
            ...section,
            questions: section.questions.map(question =>
              question.id === questionId
                ? { ...question, value, isCompleted: !!value && value !== '' }
                : question
            )
          }
        : section
    ))
  }, [])

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

  const renderQuestion = (sectionId: string, question: NFRQuestion) => {
    const inputId = `${sectionId}-${question.id}`

    switch (question.inputType) {
      case 'size-range': {
        const v = (question.value || {}) as any
        const norm: SizeRangeValue = {
          min: typeof v.min === 'number' ? v.min : '',
          max: typeof v.max === 'number' ? v.max : '',
          unit: (v.unit || 'KB') as any,
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
        return (
          <input
            id={inputId}
            type="text"
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
            placeholder={question.placeholder}
          />
        )

      case 'select':
        return (
          <select
            id={inputId}
            value={question.value || ''}
            onChange={(e) => updateQuestion(sectionId, question.id, e.target.value)}
            className="mt-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm max-w-xs"
          >
            <option value="">Select an option...</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <div className="mt-1 space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(question.value) && question.value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(question.value) ? question.value : []
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option)
                    updateQuestion(sectionId, question.id, newValues)
                  }}
                  className="h-4 w-4 text-azure-blue-600 focus:ring-azure-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

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
                      <label htmlFor={fieldInputId} className="block text-[11px] font-medium text-gray-700 mb-0.5">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={fieldInputId}
                          value={fieldValue}
                          onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                          className="block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
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
                          className="block w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 text-sm"
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
            <div className="grid grid-cols-2 gap-4">
              {question.compoundFields?.map((field) => {
                const fieldValue = question.value?.[field.id] || ''
                const fieldInputId = `${inputId}-${field.id}`
                return (
                  <div key={field.id}>
                    <label htmlFor={fieldInputId} className="block text-xs font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.suffix && <span className="text-gray-500 ml-1">({field.suffix})</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={fieldInputId}
                        value={fieldValue}
                        onChange={(e) => updateCompoundField(sectionId, question.id, field.id, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
        const cards = Array.isArray(question.value) ? question.value : []
        const maxCards = question.cardConfig?.maxCards || 10
        
        return (
          <div className="mt-1 space-y-4">
            {/* Existing Cards */}
            {cards.map((card, cardIndex) => (
              <div key={cardIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    {question.cardConfig?.cardTitle || 'Item'} {cardIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeCard(sectionId, question.id, cardIndex)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Remove</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.cardConfig?.fields.map((field) => {
                    const fieldValue = card[field.id] || ''
                    const cardFieldInputId = `${inputId}-card-${cardIndex}-${field.id}`
                    
                    return (
                      <div key={field.id}>
                        <label htmlFor={cardFieldInputId} className="block text-xs font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        
                        {field.type === 'select' ? (
                          <select
                            id={cardFieldInputId}
                            value={fieldValue}
                            onChange={(e) => updateCardField(sectionId, question.id, cardIndex, field.id, e.target.value)}
                            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500"
                          >
                            <option value="">Select...</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={cardFieldInputId}
                            type={field.type}
                            value={fieldValue}
                            onChange={(e) => updateCardField(sectionId, question.id, cardIndex, field.id, e.target.value)}
                            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500"
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            
            {/* Add New Card Button */}
            {cards.length < maxCards && (
              <button
                type="button"
                onClick={() => addCard(sectionId, question.id)}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-azure-blue-400 hover:text-azure-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>{question.cardConfig?.addButtonText || 'Add Item'}</span>
              </button>
            )}
            
            {cards.length >= maxCards && (
              <p className="text-xs text-gray-500 text-center">
                Maximum {maxCards} items reached
              </p>
            )}
          </div>
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
      <div className="bg-azure-blue-50 border border-azure-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-azure-blue-900">Overall Progress</h3>
          <span className="text-sm font-medium text-azure-blue-700">{overallPercentage}%</span>
        </div>
        <div className="w-full bg-azure-blue-200 rounded-full h-2">
          <div 
            className="bg-azure-blue-600 h-2 rounded-full transition-all duration-300" 
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
          <div key={section.id} id={`nfr-${section.id}`} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 bg-gray-50 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
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
                    <h3 className="font-medium text-gray-900">{section.title}</h3>
                    {(() => {
                      const reqTotal = section.questions.filter(q => q.isRequired).length
                      const reqDone = section.questions.filter(q => q.isRequired && q.isCompleted).length
                      const optTotal = section.questions.filter(q => q.isOptional).length
                      const optDone = section.questions.filter(q => q.isOptional && q.isCompleted).length
                      return (
                        <>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 text-architect-gray-700" title="Required questions completed">
                            Req {reqDone}/{reqTotal}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-architect-gray-300 text-architect-gray-700" title="Optional questions answered">
                            Opt {optDone}/{optTotal}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {(() => {
                  const pct = Math.round((completion.required.completed / (completion.required.total || 1)) * 100) || 0
                  // Alternate mapping: 0 red, 1–33 red, 34–66 amber, 67–99 light‑green, 100 green
                  const colorClasses = pct === 100
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : pct >= 67
                      ? 'bg-green-50 text-green-700 border-green-300'
                      : pct >= 34
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-red-50 text-red-700 border-red-300'
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
              <div className="p-4 space-y-4">
                {section.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    {(() => {
                      const forId = getQuestionLabelTargetId(section.id, question)
                      return forId ? (
                        <label htmlFor={forId} className="block">
                          <span className="text-sm font-medium text-gray-700">
                            {question.text}
                            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          {question.helpText && (
                            <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
                          )}
                        </label>
                      ) : (
                        <div className="block">
                          <span className="text-sm font-medium text-gray-700">
                            {question.text}
                            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          {question.helpText && (
                            <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
                          )}
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
