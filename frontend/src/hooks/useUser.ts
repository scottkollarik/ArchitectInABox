import { useState, useEffect } from 'react'
import { useAuth } from '../auth/EntraAuthProvider'
import { getApiBase, buildAuthHeaders } from '../utils/apiClient'

export interface User {
  id: string
  email: string
  name: string
  isAuthenticated: boolean
  isNewUser: boolean
  hasCompletedOnboarding: boolean
  createdAt?: string
  lastSeenAt?: string
}

export function useUser() {
  const auth = useAuth()
  const { isAuthenticated, isLoading: authLoading } = auth
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = async () => {
    try {
      setIsLoading(true)
      const headers = await buildAuthHeaders(auth)
      const response = await fetch(`${getApiBase()}/me`, {
        headers,
      })
      if (!response.ok) throw new Error('Failed to fetch user')
      const data = await response.json()
      setUser(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      console.error('Failed to fetch user:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const completeOnboarding = async () => {
    try {
      const headers = await buildAuthHeaders(auth, { 'Content-Type': 'application/json' })
      const response = await fetch(`${getApiBase()}/me/complete-onboarding`, {
        method: 'POST',
        headers,
      })
      if (!response.ok) throw new Error('Failed to complete onboarding')
      // Refresh user data
      await fetchUser()
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      throw err
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUser()
    } else if (!authLoading && !isAuthenticated) {
      setIsLoading(false)
      setUser(null)
    }
  }, [isAuthenticated, authLoading])

  return {
    user,
    isLoading: authLoading || isLoading,
    error,
    refetch: fetchUser,
    completeOnboarding,
  }
}
