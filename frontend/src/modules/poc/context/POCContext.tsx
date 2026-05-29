import React, { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { Project } from '../../../context/ProjectContext'
import type { NFRSection } from '../../cloud-architecture/types'
import { DEMO_PROJECT, calculateMockAlignment, calculateMockCost } from '../data/mockData'

type POCContextType = {
  project: Project
  alignment: { matched: string[]; missing: string[]; pct: number }
  cost: number
  updateNFR: (sectionId: string, questionId: string, value: any) => void
  addService: (serviceId: string, isAutoIncluded?: boolean) => void
  removeService: (serviceId: string) => void
  reset: () => void
}

const POCContext = createContext<POCContextType | undefined>(undefined)

export const POCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<Project>(DEMO_PROJECT)

  // Auto-calculate alignment whenever architecture changes
  const alignment = useMemo(() => {
    const serviceIds = (project.architecture?.items || []).map(item => item.id)
    return calculateMockAlignment(serviceIds)
  }, [project.architecture])

  // Auto-calculate cost whenever architecture changes
  const cost = useMemo(() => {
    const serviceIds = (project.architecture?.items || []).map(item => item.id)
    return calculateMockCost(serviceIds)
  }, [project.architecture])

  // Update NFR question value
  const updateNFR = useCallback((sectionId: string, questionId: string, value: any) => {
    setProject(prev => {
      const sections = [...(prev.nfrAssessment || [])]
      const sectionIndex = sections.findIndex(s => s.id === sectionId)
      if (sectionIndex === -1) return prev

      const section = { ...sections[sectionIndex] }
      const questions = [...section.questions]
      const questionIndex = questions.findIndex(q => q.id === questionId)
      if (questionIndex === -1) return prev

      questions[questionIndex] = { ...questions[questionIndex], value }
      section.questions = questions
      sections[sectionIndex] = section

      return {
        ...prev,
        nfrAssessment: sections,
        lastModified: new Date()
      }
    })
  }, [])

  // Add service to architecture
  const addService = useCallback((serviceId: string, isAutoIncluded = false) => {
    setProject(prev => {
      const items = [...(prev.architecture?.items || [])]
      if (items.some(item => item.id === serviceId)) return prev

      items.push({ id: serviceId, isAutoIncluded })

      return {
        ...prev,
        architecture: {
          items,
          lastSaved: new Date().toISOString()
        },
        lastModified: new Date()
      }
    })
  }, [])

  // Remove service from architecture
  const removeService = useCallback((serviceId: string) => {
    setProject(prev => {
      const items = (prev.architecture?.items || []).filter(item => item.id !== serviceId)

      return {
        ...prev,
        architecture: {
          items,
          lastSaved: new Date().toISOString()
        },
        lastModified: new Date()
      }
    })
  }, [])

  // Reset to initial demo state
  const reset = useCallback(() => {
    setProject(DEMO_PROJECT)
  }, [])

  const value = {
    project,
    alignment,
    cost,
    updateNFR,
    addService,
    removeService,
    reset
  }

  return (
    <POCContext.Provider value={value}>
      {children}
    </POCContext.Provider>
  )
}

export const usePOC = () => {
  const context = useContext(POCContext)
  if (!context) {
    throw new Error('usePOC must be used within POCProvider')
  }
  return context
}
