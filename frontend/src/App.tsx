import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ProjectProvider } from './context/ProjectContext'
import Layout from './components/Layout'
import CloudArchitecturePage from './modules/cloud-architecture/pages/CloudArchitecturePage'
import APIDevelopmentPage from './modules/api-development/pages/APIDevelopmentPage'
import FrontendDevelopmentPage from './modules/frontend-development/pages/FrontendDevelopmentPage'
import SystemIntegrationPage from './modules/system-integration/pages/SystemIntegrationPage'
import AIDevelopmentPage from './modules/ai-development/pages/AIDevelopmentPage'

function App() {
  return (
    <ProjectProvider>
      <DndProvider backend={HTML5Backend}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<CloudArchitecturePage />} />
              <Route path="/cloud-architecture" element={<CloudArchitecturePage />} />
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
