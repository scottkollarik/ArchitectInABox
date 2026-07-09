import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { lazy, Suspense, useState } from 'react'
import { ProjectProvider } from './context/ProjectContext'
import { POCProvider } from './modules/poc/context/POCContext'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import CloudArchitecturePage from './modules/cloud-architecture/pages/CloudArchitecturePage'
import InventoryPage from './modules/inventory/pages/InventoryPage'
import APIDevelopmentPage from './modules/api-development/pages/APIDevelopmentPage'
import FrontendDevelopmentPage from './modules/frontend-development/pages/FrontendDevelopmentPage'
import SystemIntegrationPage from './modules/system-integration/pages/SystemIntegrationPage'
import AIDevelopmentPage from './modules/ai-development/pages/AIDevelopmentPage'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsOfService from './pages/legal/TermsOfService'
import AuthCallback from './auth/AuthCallback'
import OnboardingModal from './components/OnboardingModal'
import { useUser } from './hooks/useUser'
import { useAuth } from './auth/EntraAuthProvider'

// Lazy-load POC pages
const POCIndex = lazy(() => import('./modules/poc/pages/POCIndex'))
const DrawerVariantsPOC = lazy(() => import('./modules/poc/pages/DrawerVariantsPOC'))

// Local fallback so the onboarding wizard can never trap a user even if the
// backend completion call fails (e.g. cold-start timeout or a missing route).
// Keyed per-user so a different account on the same browser still sees onboarding.
const onboardedKey = (userId: string) => `aib_onboarded_${userId}`

const ProtectedAppShell = () => {
  const { user, completeOnboarding } = useUser()
  const { isAuthenticated } = useAuth()
  const [locallyDismissed, setLocallyDismissed] = useState(false)

  const dismissedInStorage =
    !!user && localStorage.getItem(onboardedKey(user.id)) === 'true'

  const showOnboarding =
    isAuthenticated && !!user && !user.hasCompletedOnboarding &&
    !dismissedInStorage && !locallyDismissed

  // Best-effort server record, but always dismiss locally so the demo flow
  // is never blocked. The underlying error is still surfaced to the console.
  const handleOnboardingComplete = async () => {
    try {
      await completeOnboarding()
    } catch (err) {
      console.error('Onboarding completion did not persist server-side; dismissing locally', err)
    } finally {
      if (user) localStorage.setItem(onboardedKey(user.id), 'true')
      setLocallyDismissed(true)
    }
  }

  return (
    <ProtectedRoute>
      {showOnboarding && user && (
        <OnboardingModal
          userName={user.name || 'there'}
          onComplete={handleOnboardingComplete}
        />
      )}
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  )
}

function App() {
  const basename = import.meta.env.VITE_BASE_PATH || '/'
  return (
    <ThemeProvider>
      <ProjectProvider>
        <DndProvider backend={HTML5Backend}>
          <Router basename={basename !== '/' ? basename : undefined}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
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

              {/* POC Routes - wrapped in POCProvider */}
              <Route path="/poc" element={
                <POCProvider>
                  <Suspense fallback={<div className="p-8 text-center">Loading POC...</div>}>
                    <Outlet />
                  </Suspense>
                </POCProvider>
              }>
                <Route index element={<POCIndex />} />
                <Route path="drawer-variants/:variant" element={<DrawerVariantsPOC />} />
              </Route>
            </Routes>
          </Router>
        </DndProvider>
      </ProjectProvider>
    </ThemeProvider>
  )
}

export default App
