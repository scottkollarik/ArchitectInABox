import React, { useState, useEffect, useCallback } from 'react'
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

const NFRAssessmentForm: React.FC = () => {
  const { currentProject, updateProject } = useProject()
  const [sections, setSections] = useState<NFRSection[]>(nfrSections)

  // Merge saved NFR with current schema so new input types render while preserving values
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
          // Only reuse saved value if input types match to avoid shape crashes
          const useValue = sq && sq.inputType === dq.inputType ? sq.value : dq.value
          const isCompleted = typeof sq?.isCompleted === 'boolean' ? sq.isCompleted : dq.isCompleted
          return { ...dq, value: useValue, isCompleted }
        })
        return { ...def, isCollapsed: s.isCollapsed ?? def.isCollapsed, questions: mergedQs }
      })
    }
    setSections(merge(currentProject?.nfrAssessment as NFRSection[] | undefined, nfrSections))
  }, [currentProject])

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
      case 'percentage-split':
        return (
          <PercentageSplit
            id={inputId}
            value={question.value}
            onChange={(val) => updateQuestion(sectionId, question.id, val)}
            className="mt-1"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azure-blue-500 focus:border-azure-blue-500 sm:text-sm"
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
                          <option key={option} value={option}>
                            {option}
                          </option>
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
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : hasAnswers ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <InformationCircleIcon className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-500">{Math.round((completion.required.completed / completion.required.total) * 100) || 0}%</span>
              </div>
            </button>

            {/* Section Content */}
            {!section.isCollapsed && (
              <div className="p-4 space-y-4">
                {section.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <label htmlFor={`${section.id}-${question.id}`} className="block">
                      <span className="text-sm font-medium text-gray-700">
                        {question.text}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {question.helpText && (
                        <p className="text-xs text-gray-500 mt-1">{question.helpText}</p>
                      )}
                    </label>
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
