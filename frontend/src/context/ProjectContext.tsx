import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react'
import type {
  NFRSection,
  ProjectArchitectureState,
  ProjectCloudConfig,
  ProjectProfile,
  ProjectConstraints
} from '../modules/cloud-architecture/types'
import { useAuth } from '../auth/EntraAuthProvider'
import { buildAuthHeaders, getApiBase } from '../utils/apiClient'

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
  isLoading: boolean
  createProject: (name: string, description: string) => Promise<Project>
  loadProject: (projectId: string) => Promise<void>
  updateProject: (updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  saveProject: () => Promise<void>
  setArchitecture: (arch: ProjectArchitectureState) => Promise<void>
  refreshProjects: () => Promise<Project[]>
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
  const auth = useAuth()
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const pendingSyncTimers = useRef<Record<string, number>>({})
  const lastProjectIdRef = useRef<string | null>(null)
  const apiBaseRef = useRef<string>()

  const ensureApiBase = useCallback(() => {
    if (!apiBaseRef.current) {
      apiBaseRef.current = getApiBase()
    }
    return apiBaseRef.current
  }, [])

  const buildUrl = useCallback((path: string) => {
    const base = ensureApiBase().replace(/\/+$/, '')
    const relative = path.replace(/^\/+/, '')
    if (!relative) return base
    const shouldTrimApi = base.toLowerCase().endsWith('/api') && relative.toLowerCase().startsWith('api/')
    const normalizedPath = shouldTrimApi ? relative.slice(4) : relative
    return `${base}/${normalizedPath}`
  }, [ensureApiBase])

  const parseDate = (value: any): Date => {
    if (!value) return new Date()
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }

  const fetchJson = useCallback(async (path: string, init: RequestInit = {}) => {
    const url = buildUrl(path)
    const headers = await buildAuthHeaders(auth, init.headers ?? {})
    const response = await fetch(url, { ...init, headers })

    if (response.status === 204) {
      return null
    }

    if (!response.ok) {
      const error = new Error(`Request to ${path} failed with status ${response.status}`)
      ;(error as any).status = response.status
      ;(error as any).body = await response.text().catch(() => undefined)
      throw error
    }

    return response.json()
  }, [auth, buildUrl])

  const mapProjectFromApi = useCallback(async (doc: any): Promise<Project> => {
    const id: string = doc.id || doc._id || `project-${crypto.randomUUID?.() ?? Date.now()}`
    const base: Project = {
      id,
      name: doc.name || 'Untitled Project',
      description: doc.description || '',
      createdAt: parseDate(doc.createdAt),
      lastModified: parseDate(doc.lastModified),
      cloud: doc.cloud || undefined,
      profile: doc.profile || undefined,
      architecture: doc.architecture || undefined,
      constraints: doc.constraints || undefined,
      nfrAssessment: []
    }

    try {
      const nfr = await fetchJson(`/api/projects/${encodeURIComponent(id)}/nfr`)
      if (nfr && Array.isArray(nfr.sections)) {
        base.nfrAssessment = nfr.sections as NFRSection[]
      }
    } catch (error) {
      if ((error as any).status !== 404) {
        console.error('Failed to load NFR assessment', error)
      }
    }

    return base
  }, [fetchJson])

  const persistProject = useCallback(async (project: Project) => {
    const payload = {
      id: project.id,
      name: project.name,
      description: project.description ?? '',
      profile: project.profile ?? null,
      cloud: project.cloud ?? null,
      architecture: project.architecture ?? null,
      constraints: project.constraints ?? null,
      schemaVersion: 1,
      createdAt: project.createdAt.toISOString(),
      lastModified: project.lastModified.toISOString()
    }

    await fetchJson('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const sections = project.nfrAssessment ?? []
    const nfrPayload = {
      id: project.id,
      projectId: project.id,
      sections,
      completionStatus: {},
      schemaVersion: 1,
      createdAt: project.createdAt.toISOString(),
      lastModified: project.lastModified.toISOString()
    }

    await fetchJson(`/api/projects/${encodeURIComponent(project.id)}/nfr`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nfrPayload)
    })
  }, [fetchJson])

  const scheduleSync = useCallback((project: Project) => {
    const timerId = pendingSyncTimers.current[project.id]
    if (timerId) {
      window.clearTimeout(timerId)
    }

    pendingSyncTimers.current[project.id] = window.setTimeout(() => {
      persistProject(project).catch(error => {
        console.error('Failed to sync project', error)
      })
      delete pendingSyncTimers.current[project.id]
    }, 800)
  }, [persistProject])

  const refreshProjects = useCallback(async (): Promise<Project[]> => {
    if (auth.isAuthEnabled && !auth.isAuthenticated) {
      setProjects([])
      setCurrentProject(null)
      return []
    }

    setIsLoading(true)
    try {
      const list = await fetchJson('/api/projects')
      const mapped = Array.isArray(list) ? await Promise.all(list.map(mapProjectFromApi)) : []
      setProjects(mapped)

      const lastProjectId = lastProjectIdRef.current || localStorage.getItem('architect-last-project')
      const nextCurrent = lastProjectId ? mapped.find(p => p.id === lastProjectId) : mapped[0]
      setCurrentProject(nextCurrent ?? null)
      if (nextCurrent) {
        localStorage.setItem('architect-last-project', nextCurrent.id)
        lastProjectIdRef.current = nextCurrent.id
      }
      return mapped
    } catch (error) {
      console.error('Failed to refresh projects', error)
      setProjects([])
      setCurrentProject(null)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [auth.isAuthEnabled, auth.isAuthenticated, fetchJson, mapProjectFromApi])

  useEffect(() => {
    if (auth.isLoading) return
    refreshProjects()
  }, [auth.isLoading, auth.isAuthenticated, refreshProjects])

  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('architect-last-project', currentProject.id)
      lastProjectIdRef.current = currentProject.id
    }
  }, [currentProject?.id])

  const createProject = useCallback(async (name: string, description: string): Promise<Project> => {
    const id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const project = createEmptyProject(id, name, description)
    await persistProject(project)
    setProjects(prev => [...prev, project])
    setCurrentProject(project)
    localStorage.setItem('architect-last-project', project.id)
    lastProjectIdRef.current = project.id
    return project
  }, [persistProject])

  const loadProject = useCallback(async (projectId: string): Promise<void> => {
    const existing = projects.find(p => p.id === projectId)
    if (existing) {
      setCurrentProject(existing)
      return
    }

    const refreshed = await refreshProjects()
    const loaded = refreshed.find(p => p.id === projectId)
    if (loaded) {
      setCurrentProject(loaded)
      return
    }

    throw new Error(`Project ${projectId} not found`)
  }, [projects, refreshProjects])

  const updateProject = useCallback(async (updates: Partial<Project>): Promise<void> => {
    if (!currentProject) return

    const updatedProject: Project = {
      ...currentProject,
      ...updates,
      lastModified: new Date()
    }

    setCurrentProject(updatedProject)
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)))
    scheduleSync(updatedProject)
  }, [currentProject, scheduleSync])

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    await fetchJson(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== projectId))
    if (currentProject?.id === projectId) {
      setCurrentProject(null)
      lastProjectIdRef.current = null
      localStorage.removeItem('architect-last-project')
    }
  }, [currentProject?.id, fetchJson])

  const saveProject = useCallback(async (): Promise<void> => {
    if (!currentProject) return
    const updated = { ...currentProject, lastModified: new Date() }
    setCurrentProject(updated)
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    await persistProject(updated)
  }, [currentProject, persistProject])

  const setArchitecture = useCallback(async (arch: ProjectArchitectureState): Promise<void> => {
    if (!currentProject) return
    const updated = {
      ...currentProject,
      architecture: arch,
      lastModified: new Date()
    }
    setCurrentProject(updated)
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    scheduleSync(updated)
  }, [currentProject, scheduleSync])

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      isLoading,
      createProject,
      loadProject,
      updateProject,
      deleteProject,
      saveProject,
      setArchitecture,
      refreshProjects
    }}>
      {children}
    </ProjectContext.Provider>
  )
}
