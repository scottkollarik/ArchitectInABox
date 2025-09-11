import React, { useState } from 'react'
import { 
  ChevronDownIcon, 
  PlusIcon, 
  FolderIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useProject } from '../context/ProjectContext'
import ProjectSettingsModal from './ProjectSettingsModal'

const ProjectHeader: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { 
    currentProject, 
    projects, 
    createProject, 
    loadProject, 
    deleteProject 
  } = useProject()
  
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    
    await createProject(newProjectName.trim(), newProjectDescription.trim())
    setShowNewProjectModal(false)
    setNewProjectName('')
    setNewProjectDescription('')
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  // Compact rendering for top header integration
  if (compact) {
    return (
      <div className="relative">
        {/* Selector button */}
        <button
          onClick={() => setShowProjectMenu(!showProjectMenu)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded border border-white/30"
          title={currentProject ? currentProject.name : 'Select project'}
        >
          <FolderIcon className="w-4 h-4" />
          <span className="text-sm font-medium truncate max-w-[180px]">{currentProject?.name || 'No Project Selected'}</span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>

        {/* Dropdown */}
        {showProjectMenu && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-architect-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-architect-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-architect-gray-900">Projects</h3>
              <button
                onClick={() => {
                  setShowNewProjectModal(true)
                  setShowProjectMenu(false)
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-azure-blue-600 text-white text-xs rounded hover:bg-azure-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-architect-gray-500">
                  <FolderIcon className="w-8 h-8 mx-auto mb-2 text-architect-gray-300" />
                  <p className="text-sm">No projects yet</p>
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      loadProject(project.id)
                      setShowProjectMenu(false)
                    }}
                    className="block w-full text-left p-3 hover:bg-architect-gray-50 border-b border-architect-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-architect-gray-900 truncate">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-architect-gray-600 truncate">{project.description}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Click outside to close (compact mode) */}
        {showProjectMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProjectMenu(false)}
          />
        )}

        {/* New Project Modal (reuse) */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-architect-gray-900">Create New Project</h3>
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="text-architect-gray-400 hover:text-architect-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-architect-gray-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-architect-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azure-blue-500 focus:border-azure-blue-500"
                      placeholder="Enter project name"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-architect-gray-700 mb-1">Description</label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-architect-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azure-blue-500 focus:border-azure-blue-500"
                      placeholder="Enter project description (optional)"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 px-4 py-2 text-architect-gray-700 bg-architect-gray-100 rounded-md hover:bg-architect-gray-200"
                  >Cancel</button>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 px-4 py-2 bg-azure-blue-600 text-white rounded-md hover:bg-azure-blue-700 disabled:opacity-50"
                  >Create Project</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full header rendering (legacy wide bar under navigation)
  return (
    <>
      <div className="bg-white border-b border-architect-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-architect-gray-50 hover:bg-architect-gray-100 rounded-lg border border-architect-gray-200 transition-colors"
            >
              <FolderIcon className="w-5 h-5 text-architect-gray-600" />
              <div className="text-left">
                <div className="font-medium text-architect-gray-900 flex items-center space-x-2">
                  <span>{currentProject?.name || 'No Project Selected'}</span>
                </div>
                {currentProject && (
                  <div className="text-xs text-architect-gray-500">
                    Modified {formatDate(currentProject.lastModified)}
                  </div>
                )}
              </div>
              <ChevronDownIcon className="w-4 h-4 text-architect-gray-600" />
            </button>

            {/* Project Dropdown Menu */}
            {showProjectMenu && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-architect-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-architect-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-architect-gray-900">Projects</h3>
                    <button
                      onClick={() => {
                        setShowNewProjectModal(true)
                        setShowProjectMenu(false)
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-azure-blue-600 text-white text-sm rounded hover:bg-azure-blue-700 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>New Project</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {projects.length === 0 ? (
                    <div className="p-4 text-center text-architect-gray-500">
                      <FolderIcon className="w-8 h-8 mx-auto mb-2 text-architect-gray-300" />
                      <p className="text-sm">No projects yet</p>
                      <p className="text-xs">Create your first project to get started</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-3 hover:bg-architect-gray-50 border-b border-architect-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between">
                          <button
                            onClick={() => {
                              loadProject(project.id)
                              setShowProjectMenu(false)
                            }}
                            className="flex-1 text-left"
                          >
                            <div className="font-medium text-architect-gray-900">
                              {project.name}
                            </div>
                            {project.description && (
                              <p className="text-sm text-architect-gray-600 mt-1">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2 text-xs text-architect-gray-500">
                              <ClockIcon className="w-3 h-3" />
                              <span>Modified {formatDate(project.lastModified)}</span>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Are you sure you want to delete this project?')) {
                                deleteProject(project.id)
                              }
                            }}
                            className="p-1 text-architect-gray-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project Info */}
          {currentProject && (
            <div className="text-right">
              <div className="text-sm font-medium text-architect-gray-900">
                {currentProject.name}
              </div>
              <div className="text-xs text-architect-gray-500">
                Created {formatDate(currentProject.createdAt)}
              </div>
              <div className="mt-1">
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-xs px-2 py-1 border border-architect-gray-300 rounded text-architect-gray-700 hover:bg-architect-gray-50"
                >
                  Project Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-architect-gray-900">Create New Project</h3>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="text-architect-gray-400 hover:text-architect-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-architect-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-architect-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azure-blue-500 focus:border-azure-blue-500"
                    placeholder="Enter project name"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-architect-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-architect-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azure-blue-500 focus:border-azure-blue-500"
                    placeholder="Enter project description (optional)"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 px-4 py-2 text-architect-gray-700 bg-architect-gray-100 rounded-md hover:bg-architect-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="flex-1 px-4 py-2 bg-azure-blue-600 text-white rounded-md hover:bg-azure-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
  {showProjectMenu && (
    <div
      className="fixed inset-0 z-40"
      onClick={() => setShowProjectMenu(false)}
    />
  )}
  {showSettings && (
    <ProjectSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
  )}
    </>
  )
}

export default ProjectHeader
