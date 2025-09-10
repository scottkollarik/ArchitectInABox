import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ProjectProvider } from './context/ProjectContext'
import Layout from './components/Layout'
import CloudArchitecturePage from './modules/cloud-architecture/pages/CloudArchitecturePage'

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
              <Route path="/api-development" element={<div className="p-8 text-center text-gray-500">API Development module coming soon...</div>} />
              <Route path="/frontend-development" element={<div className="p-8 text-center text-gray-500">Frontend Development module coming soon...</div>} />
              <Route path="/system-integration" element={<div className="p-8 text-center text-gray-500">System Integration module coming soon...</div>} />
              <Route path="/ai-development" element={<div className="p-8 text-center text-gray-500">AI Development module coming soon...</div>} />
            </Routes>
          </Layout>
        </Router>
      </DndProvider>
    </ProjectProvider>
  )
}

export default App