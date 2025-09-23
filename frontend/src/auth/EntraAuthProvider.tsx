import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PublicClientApplication, Configuration, AccountInfo, RedirectRequest, SilentRequest } from '@azure/msal-browser'

const authEnabled = (import.meta.env.VITE_ENABLE_ENTRA_AUTH ?? 'true').toLowerCase() !== 'false'

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

const msalInstance: PublicClientApplication | null = authEnabled ? new PublicClientApplication(msalConfig) : null

interface AuthContextType {
  isAuthenticated: boolean
  user: AccountInfo | null
  displayName: string | null
  email: string | null
  tenantId: string | null
  objectId: string | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  isAuthEnabled: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

interface EntraAuthProviderProps {
  children: ReactNode
}

export const EntraAuthProvider: React.FC<EntraAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AccountInfo | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [objectId, setObjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      if (!authEnabled) {
        setUser(null)
        setDisplayName('Dev User')
        setEmail('dev.user@example.com')
        setTenantId('dev-tenant')
        setObjectId('dev-user-1')
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      if (!msalInstance) {
        setIsLoading(false)
        return
      }

      try {
        await msalInstance.initialize()

        const response = await msalInstance.handleRedirectPromise()
        let activeAccount: AccountInfo | undefined
        if (response) {
          activeAccount = response.account
        } else {
          const accounts = msalInstance.getAllAccounts()
          if (accounts.length > 0) {
            activeAccount = accounts[0]
          }
        }
        if (activeAccount) {
          msalInstance.setActiveAccount(activeAccount)
          setUser(activeAccount)
          setIsAuthenticated(true)
          const claims = activeAccount.idTokenClaims || {}
          setDisplayName((claims['name'] as string) || activeAccount.name || activeAccount.username || null)
          setEmail(activeAccount.username || (claims['preferred_username'] as string) || null)
          setTenantId((claims['tid'] as string) || null)
          setObjectId((claims['oid'] as string) || (activeAccount.homeAccountId?.split('.')[0] ?? null))
        }
      } catch (error) {
        console.error('MSAL initialization failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  const login = async () => {
    if (!authEnabled) {
      setIsAuthenticated(true)

      return
    }
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

    if (!msalInstance) return

    try {
      setIsLoading(true)
      await msalInstance.loginRedirect(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (!authEnabled) {
      setIsAuthenticated(false)
      setUser(null)
      return
    }
    if (!msalInstance) {
      setIsLoading(false)
      return
    }

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
    if (!authEnabled) return null
    if (!user || !msalInstance) return null

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
    displayName,
    email,
    tenantId,
    objectId,
    isLoading,
    login,
    logout,
    getAccessToken,
    isAuthEnabled: authEnabled,
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
