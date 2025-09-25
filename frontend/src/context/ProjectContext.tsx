import React, { createContext, useContext, useState, useEffect } from 'react'
import type { NFRSection, ProjectArchitectureState, ProjectCloudConfig, ProjectProfile, ProjectConstraints } from '../modules/cloud-architecture/types'

// Simple project management without multi-cloud complexity
export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  lastModified: Date
  nfrAssessment?: NFRSection[]
  architecture?: ProjectArchitectureState
  cloud?: ProjectCloudConfig
  profile?: ProjectProfile
  constraints?: ProjectConstraints
}

interface ProjectContextType {
  currentProject: Project | null
  projects: Project[]
  createProject: (name: string, description: string) => Promise<Project>
  loadProject: (projectId: string) => Promise<void>
  updateProject: (updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  saveProject: () => Promise<void>
  setArchitecture: (arch: ProjectArchitectureState) => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

// Create empty project template
const createEmptyProject = (id: string, name: string, description: string): Project => ({
  id,
  name,
  description,
  createdAt: new Date(),
  lastModified: new Date(),
  cloud: { provider: 'azure', cloudFamily: 'public', drStrategy: 'none' },
  profile: {
    level: 'starter',
    size: 'M',
    criticality: 'dev/test',
    useWafBaseline: true,
    wafAdaptiveAdditions: false
  }
})

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('architect-projects')
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects)
        setProjects(parsedProjects)
        
        // Load last active project
        const lastProjectId = localStorage.getItem('architect-last-project')
        if (lastProjectId) {
          const lastProject = parsedProjects.find((p: Project) => p.id === lastProjectId)
          if (lastProject) {
            setCurrentProject(lastProject)
          }
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }
  }, [])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('architect-projects', JSON.stringify(projects))
    }
  }, [projects])

  // Save current project ID
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('architect-last-project', currentProject.id)
    }
  }, [currentProject])

  const createProject = async (name: string, description: string): Promise<Project> => {
    const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newProject = createEmptyProject(id, name, description)
    
    setProjects(prev => [...prev, newProject])
    setCurrentProject(newProject)
    
    return newProject
  }

  const loadProject = async (projectId: string): Promise<void> => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
    } else {
      throw new Error(`Project ${projectId} not found`)
    }
  }

  const updateProject = async (updates: Partial<Project>): Promise<void> => {
    if (!currentProject) return
    
    const updatedProject = {
      ...currentProject,
      ...updates,
      lastModified: new Date()
    }
    
    setCurrentProject(updatedProject)
    setProjects(prev => prev.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ))
  }

  const deleteProject = async (projectId: string): Promise<void> => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
    if (currentProject?.id === projectId) {
      setCurrentProject(null)
    }
  }

  const saveProject = async (): Promise<void> => {
    if (!currentProject) return
    
    const updatedProject = { ...currentProject, lastModified: new Date() }
    setCurrentProject(updatedProject)
    setProjects(prev => prev.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ))
  }

  const setArchitecture = async (arch: ProjectArchitectureState): Promise<void> => {
    if (!currentProject) return
    const updated = { ...currentProject, architecture: arch, lastModified: new Date() }
    setCurrentProject(updated)
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
  }

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      createProject,
      loadProject,
      updateProject,
      deleteProject,
      saveProject,
      setArchitecture
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
