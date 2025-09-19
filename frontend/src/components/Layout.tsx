import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  CloudIcon, 
  CodeBracketIcon, 
  DevicePhoneMobileIcon, 
  Cog6ToothIcon, 
  CpuChipIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import ProjectHeader from './ProjectHeader'
import UserBadge from './UserBadge'

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
    { path: '/inventory', name: 'Inventory', icon: CircleStackIcon },
  ]

  const isActivePath = (path: string) => location.pathname === path

  // Routes that render a joined strip under the nav; remove nav bottom border to weld
  const joinedRoutes = [
    '/cloud-architecture',
    '/inventory',
    '/api-development',
    '/frontend-development',
    '/system-integration',
    '/ai-development',
  ]
  const isJoined = joinedRoutes.some((p) => isActivePath(p))

  return (
    <div className="min-h-screen bg-architect-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-azure-blue-600 to-azure-blue-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/cloud-architecture" className="flex items-center space-x-3">
                <CloudIcon className="w-8 h-8 text-white" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white truncate">Architect in a Box</h1>
                  <p className="text-azure-blue-100 text-sm truncate">Professional Cloud Architecture Planning & Intelligence</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <div className="text-azure-blue-100 text-sm hidden md:block">MVP Version 1.0</div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:flex-initial">
                  <ProjectHeader compact />
                </div>
                <UserBadge />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`bg-white ${isJoined ? 'border-b-0 pb-0' : 'border-b border-architect-gray-200'} shadow-sm`}>
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-300 ${
                    isActivePath(item.path)
                      ? 'text-azure-blue-700 bg-azure-blue-50 border border-azure-blue-300 border-b-0 rounded-t-md -mb-px z-10'
                      : 'text-architect-gray-600 border-b-2 border-transparent hover:text-azure-blue-600 hover:border-azure-blue-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span
                    data-nav-label={item.path.replace('/', '') || 'home'}
                    className={`${isActivePath(item.path) ? 'hidden' : ''}`}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Project Header moved into top header */}

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-0 pb-6">
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
