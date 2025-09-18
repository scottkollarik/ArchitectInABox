import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './EntraAuthProvider'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to the app after successful authentication
        const returnUrl = sessionStorage.getItem('returnUrl') || '/'
        sessionStorage.removeItem('returnUrl')
        navigate(returnUrl, { replace: true })
      } else {
        // Authentication failed, redirect to login
        navigate('/login', { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback