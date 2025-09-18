import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  const basename = import.meta.env.VITE_BASE_PATH || '/'
  return (
    <ProjectProvider>
      <DndProvider backend={HTML5Backend}>
        <Router basename={basename !== '/' ? basename : undefined}>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/cloud-architecture" replace />} />
              <Route path="/cloud-architecture" element={<CloudArchitecturePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              {/* Future routes */}
              <Route path="/api-development" element={<APIDevelopmentPage />} />
              <Route path="/frontend-development" element={<FrontendDevelopmentPage />} />
              <Route path="/system-integration" element={<SystemIntegrationPage />} />
              <Route path="/ai-development" element={<AIDevelopmentPage />} />
            </Routes>
          </Layout>
        </Router>
      </DndProvider>
    </ProjectProvider>
  )
}

export default App
