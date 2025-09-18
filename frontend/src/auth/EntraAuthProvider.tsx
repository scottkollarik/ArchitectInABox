import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PublicClientApplication, Configuration, AccountInfo, RedirectRequest, SilentRequest } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_OAUTH_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

const msalInstance = new PublicClientApplication(msalConfig)

interface AuthContextType {
  isAuthenticated: boolean
  user: AccountInfo | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface EntraAuthProviderProps {
  children: ReactNode
}

export const EntraAuthProvider: React.FC<EntraAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize()

        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise()
        if (response) {
          setUser(response.account)
          setIsAuthenticated(true)
        } else {
          // Check if user is already signed in
          const accounts = msalInstance.getAllAccounts()
          if (accounts.length > 0) {
            setUser(accounts[0])
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        console.error('MSAL initialization failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeMsal()
  }, [])

  const login = async () => {
    const loginRequest: RedirectRequest = {
      scopes: [
        'openid',
        'profile',
        'email',
        'User.Read',
        // Add your API scopes here:
        // `api://${import.meta.env.VITE_OAUTH_CLIENT_ID}/access_as_user`
      ],
      prompt: 'select_account',
    }

    try {
      setIsLoading(true)
      await msalInstance.loginRedirect(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoading(false)
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (!user) return null

    const silentRequest: SilentRequest = {
      scopes: [
        'User.Read',
        // Add your API scopes here:
        // `api://${import.meta.env.VITE_OAUTH_CLIENT_ID}/access_as_user`
      ],
      account: user,
    }

    try {
     const response = await msalInstance.acquireTokenSilent(silentRequest)
     return response.accessToken
    } catch (error) {
      console.error('Silent token acquisition failed:', error)

      // If silent request fails, try interactive
      try {
        await msalInstance.acquireTokenRedirect(silentRequest)
        return null
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError)
        return null
      }
    }
  }

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    getAccessToken,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an EntraAuthProvider')
  }
  return context
}
