import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  CloudIcon, 
  CodeBracketIcon, 
  DevicePhoneMobileIcon, 
  Cog6ToothIcon, 
  CpuChipIcon 
} from '@heroicons/react/24/outline'
import ProjectHeader from './ProjectHeader'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  const navigationItems = [
    { path: '/cloud-architecture', name: 'Cloud Architecture', icon: CloudIcon },
    { path: '/api-development', name: 'API Development', icon: CodeBracketIcon },
    { path: '/frontend-development', name: 'Frontend', icon: DevicePhoneMobileIcon },
    { path: '/system-integration', name: 'Integration', icon: Cog6ToothIcon },
    { path: '/ai-development', name: 'AI Development', icon: CpuChipIcon },
  ]

  const isActivePath = (path: string) => {
    return location.pathname === path || (path === '/cloud-architecture' && location.pathname === '/')
  }

  return (
    <div className="min-h-screen bg-architect-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-azure-blue-600 to-azure-blue-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="flex items-center space-x-3">
                <CloudIcon className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Architect in a Box</h1>
                  <p className="text-azure-blue-100 text-sm">Professional Cloud Architecture Planning & Intelligence</p>
                </div>
              </Link>
            </div>
            <div className="text-azure-blue-100 text-sm">
              MVP Version 1.0
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-architect-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors duration-200 border-b-2 ${
                    isActivePath(item.path)
                      ? 'text-azure-blue-600 border-azure-blue-600 bg-azure-blue-50'
                      : 'text-architect-gray-600 border-transparent hover:text-azure-blue-600 hover:border-azure-blue-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Project Header */}
      <ProjectHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-architect-gray-800 text-architect-gray-300 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Architect in a Box</h3>
              <p className="text-sm">
                Professional cloud architecture expertise and intelligent service recommendations 
                packaged into an accessible planning platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Features</h3>
              <ul className="text-sm space-y-2">
                <li>NFR Assessment Forms</li>
                <li>Azure Services Catalog</li>
                <li>Architecture Planning</li>
                <li>Cost Estimation</li>
                <li>Educational Content</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Technologies</h3>
              <ul className="text-sm space-y-2">
                <li>React + TypeScript</li>
                <li>ASP.NET Core Minimal APIs</li>
                <li>MongoDB</li>
                <li>Docker Compose</li>
                <li>Tailwind CSS</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-architect-gray-700 mt-8 pt-4 text-center text-sm">
            <p>&copy; 2024 Architect in a Box. Professional architecture expertise made accessible.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout