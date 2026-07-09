import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { PublicClientApplication, Configuration, AccountInfo, RedirectRequest, SilentRequest, InteractionRequiredAuthError } from '@azure/msal-browser'

// Module-level guard so concurrent API calls (each calling getAccessToken)
// don't each fire an interactive redirect.
let interactiveTokenInProgress = false

const authEnabled = (import.meta.env.VITE_ENABLE_ENTRA_AUTH ?? 'true').toLowerCase() !== 'false'

const apiScope = import.meta.env.VITE_OAUTH_SCOPE || (import.meta.env.VITE_OAUTH_CLIENT_ID ? `api://${import.meta.env.VITE_OAUTH_CLIENT_ID}/user_impersonation` : undefined)

const basePath = import.meta.env.VITE_BASE_PATH || '/'
const normalizedBasePath = basePath === '/' ? '' : `/${basePath.replace(/^\/+|\/+$/g, '')}`
const withBasePath = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${normalizedBasePath}${normalizedPath}`
}

const defaultScopes = ['openid', 'profile', 'email']
const graphScope = 'User.Read'
const effectiveScopes = apiScope ? [...defaultScopes, graphScope, apiScope] : [...defaultScopes, graphScope]

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_OAUTH_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || withBasePath('/auth/callback'),
    postLogoutRedirectUri: normalizedBasePath ? `${window.location.origin}${normalizedBasePath}/` : `${window.location.origin}/`,
    // We use a dedicated /auth/callback route that navigates via returnUrl itself.
    // Leaving this true (the default) makes MSAL ALSO navigate to the login-request
    // URL, and the two competing navigations cause a post-consent redirect loop.
    navigateToLoginRequestUrl: false,
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
  // Guard against React StrictMode double-invoke and component remounts
  const initStarted = useRef(false)

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

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
      scopes: effectiveScopes,
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

    // Request ONLY the API scope, not Graph scopes
    // When you mix scopes, MSAL returns a token for one resource at a time
    const apiOnlyScopes = apiScope ? [apiScope] : []

    if (apiOnlyScopes.length === 0) {
      console.warn('No API scope configured - cannot get access token for backend')
      return null
    }

    const silentRequest: SilentRequest = {
      scopes: apiOnlyScopes,
      account: user,
    }

    try {
      const response = await msalInstance.acquireTokenSilent(silentRequest)
      return response.accessToken
    } catch (error) {
      // Refresh token expired or consent required → silent acquisition fails.
      // Recover by re-authenticating interactively. Returning null here (the old
      // behavior) left the app logged-in-but-tokenless, so every API call 401'd
      // silently (empty projects, dead "Create Project" button, etc.).
      if (error instanceof InteractionRequiredAuthError) {
        if (!interactiveTokenInProgress && msalInstance) {
          interactiveTokenInProgress = true
          try {
            // Full-page redirect to re-auth; on return, cached token is fresh.
            await msalInstance.acquireTokenRedirect({ scopes: apiOnlyScopes, account: user })
          } catch (redirectError) {
            interactiveTokenInProgress = false
            console.error('Interactive token acquisition failed:', redirectError)
          }
        }
        // The page is navigating away for re-auth; no token to return this call.
        return null
      }
      console.error('Silent token acquisition failed:', error)
      return null
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
