import { useAuth } from '../auth/EntraAuthProvider'

export const getApiBase = () => {
  const base = import.meta.env.VITE_API_URL || ''
  if (!base) throw new Error('VITE_API_URL not configured')
  return base.replace(/\/$/, '')
}

export const buildAuthHeaders = async (auth: ReturnType<typeof useAuth>, extra?: HeadersInit) => {
  const headers: HeadersInit = extra ? { ...(extra as any) } : {}
  if (auth.displayName) (headers as any)['X-User-Name'] = auth.displayName
  if (auth.email) (headers as any)['X-User-Email'] = auth.email
  if (auth.objectId) (headers as any)['X-User-Id'] = auth.objectId
  if (auth.tenantId) (headers as any)['X-Tenant-Id'] = auth.tenantId
  const token = await auth.getAccessToken()
  if (token) (headers as any)['Authorization'] = `Bearer ${token}`
  return headers
}

export const authQuery = (auth: ReturnType<typeof useAuth>) => {
  const params = new URLSearchParams()
  if (auth.objectId) params.append('ownerId', auth.objectId)
  else if (auth.email) params.append('ownerId', auth.email)
  params.append('ownerScope', 'user')
  return params.toString()
}
