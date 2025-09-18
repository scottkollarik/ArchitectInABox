import React from 'react'
import { useAuth } from '../auth/EntraAuthProvider'
import { Navigate } from 'react-router-dom'

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Technical Architect Platform
          </h1>
          <p className="text-gray-600">
            Cloud architecture recommendations and NFR assessment
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 12.5c0-.83-.08-1.49-.21-2.16H12v4.08h6.46c-.25 1.32-.95 2.44-2.04 3.16v2.58h3.31c1.94-1.79 3.04-4.42 3.04-7.66z"/>
              <path d="M12 23c2.73 0 5.01-.9 6.68-2.44l-3.31-2.58c-.9.6-2.05.95-3.37.95-2.6 0-4.79-1.75-5.58-4.11H2.92v2.66C4.57 20.93 8.03 23 12 23z"/>
              <path d="M6.42 14.82c-.2-.6-.31-1.24-.31-1.82s.11-1.22.31-1.82V8.52H2.92C2.33 9.69 2 11.01 2 12.5s.33 2.81.92 4.98l3.5-2.66z"/>
              <path d="M12 5.38c1.46 0 2.77.5 3.8 1.49L18.65 4c-1.67-1.56-3.95-2.5-6.65-2.5-3.97 0-7.43 2.07-9.08 5.52l3.5 2.66C7.21 7.13 9.4 5.38 12 5.38z"/>
            </svg>
            Sign in with Microsoft
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Sign in using your organizational account or Microsoft personal account
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage