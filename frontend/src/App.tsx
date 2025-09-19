import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ProjectProvider } from './context/ProjectContext'
import Layout from './components/Layout'
import CloudArchitecturePage from './modules/cloud-architecture/pages/CloudArchitecturePage'
import InventoryPage from './modules/inventory/pages/InventoryPage'
import APIDevelopmentPage from './modules/api-development/pages/APIDevelopmentPage'
import FrontendDevelopmentPage from './modules/frontend-development/pages/FrontendDevelopmentPage'
import SystemIntegrationPage from './modules/system-integration/pages/SystemIntegrationPage'
import AIDevelopmentPage from './modules/ai-development/pages/AIDevelopmentPage'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AuthCallback from './auth/AuthCallback'

const ProtectedAppShell = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
)

function App() {
  const basename = import.meta.env.VITE_BASE_PATH || '/'
  return (
    <ProjectProvider>
      <DndProvider backend={HTML5Backend}>
        <Router basename={basename !== '/' ? basename : undefined}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<ProtectedAppShell />}>
              <Route path="/" element={<Navigate to="/cloud-architecture" replace />} />
              <Route path="/cloud-architecture" element={<CloudArchitecturePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/api-development" element={<APIDevelopmentPage />} />
              <Route path="/frontend-development" element={<FrontendDevelopmentPage />} />
              <Route path="/system-integration" element={<SystemIntegrationPage />} />
              <Route path="/ai-development" element={<AIDevelopmentPage />} />
            </Route>
          </Routes>
        </Router>
      </DndProvider>
    </ProjectProvider>
  )
}

export default App
