import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUser, type User } from './useUser'

// ── Module mocks ─────────────────────────────────────────────────────────────

// Mock the entire auth module so the hook never touches MSAL
vi.mock('../auth/EntraAuthProvider', () => ({
  useAuth: vi.fn(),
}))

// Mock the API client utilities
vi.mock('../utils/apiClient', () => ({
  getApiBase: vi.fn(() => 'https://api.example.com'),
  buildAuthHeaders: vi.fn(async () => ({ 'X-User-Id': 'test-user' })),
}))

// ── Typed imports after mocking ───────────────────────────────────────────────

import { useAuth } from '../auth/EntraAuthProvider'
import { getApiBase, buildAuthHeaders } from '../utils/apiClient'

const mockUseAuth = vi.mocked(useAuth)
const mockGetApiBase = vi.mocked(getApiBase)
const mockBuildAuthHeaders = vi.mocked(buildAuthHeaders)

// ── Default auth context shape ────────────────────────────────────────────────

function makeAuthContext(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    isAuthenticated: true,
    isLoading: false,
    user: null,
    displayName: 'Test User',
    email: 'test@example.com',
    tenantId: 'tenant-1',
    objectId: 'obj-1',
    isAuthEnabled: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(async () => 'mock-token'),
    ...overrides,
  }
}

// ── Sample API user response ──────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-abc',
  email: 'test@example.com',
  name: 'Test User',
  isAuthenticated: true,
  isNewUser: false,
  hasCompletedOnboarding: true,
  createdAt: '2024-01-01T00:00:00Z',
  lastSeenAt: '2024-06-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiBase.mockReturnValue('https://api.example.com')
    mockBuildAuthHeaders.mockResolvedValue({ 'X-User-Id': 'test-user' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Initial / unauthenticated state ─────────────────────────────────────────

  it('starts with isLoading true before any fetch completes', () => {
    mockUseAuth.mockReturnValue(makeAuthContext({ isAuthenticated: false, isLoading: true }))
    global.fetch = vi.fn()

    const { result } = renderHook(() => useUser())

    expect(result.current.isLoading).toBe(true)
  })

  it('returns null user and stops loading when auth finishes and user is not authenticated', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext({ isAuthenticated: false, isLoading: false }))
    global.fetch = vi.fn()

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('does not call fetch when the user is not authenticated', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext({ isAuthenticated: false, isLoading: false }))
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy

    renderHook(() => useUser())

    await waitFor(() => {}) // let effects settle

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // ── Successful fetch ─────────────────────────────────────────────────────────

  it('populates user state after a successful fetch', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.error).toBeNull()
  })

  it('calls the /me endpoint with the correct URL', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)
    global.fetch = fetchSpy

    renderHook(() => useUser())

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/me',
        expect.objectContaining({ headers: expect.anything() })
      )
    })
  })

  it('passes auth headers to the fetch call', async () => {
    const expectedHeaders = { 'X-User-Id': 'obj-1', Authorization: 'Bearer mock-token' }
    mockUseAuth.mockReturnValue(makeAuthContext())
    mockBuildAuthHeaders.mockResolvedValueOnce(expectedHeaders)
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)

    renderHook(() => useUser())

    await waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expectedHeaders })
      )
    })
  })

  // ── Error state ──────────────────────────────────────────────────────────────

  it('sets error state when the /me endpoint returns a non-ok response', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to fetch user')
  })

  it('sets error state when fetch rejects with a network error', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Network failure')
  })

  it('wraps non-Error rejection values in a new Error', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    global.fetch = vi.fn().mockRejectedValueOnce('plain string error')

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to fetch user')
  })

  it('clears a previous error on a subsequent successful fetch', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())

    // First call fails
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser } as Response)

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))

    // Trigger a manual refetch
    await result.current.refetch()

    await waitFor(() => expect(result.current.error).toBeNull())
    expect(result.current.user).toEqual(mockUser)
  })

  // ── Loading state transitions ─────────────────────────────────────────────

  it('reports isLoading true while auth is still loading regardless of authentication state', () => {
    mockUseAuth.mockReturnValue(makeAuthContext({ isAuthenticated: true, isLoading: true }))
    global.fetch = vi.fn()

    const { result } = renderHook(() => useUser())

    // isLoading from hook = authLoading || hookLoading
    expect(result.current.isLoading).toBe(true)
  })

  // ── completeOnboarding ────────────────────────────────────────────────────

  it('calls the complete-onboarding endpoint and then refreshes user data', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())

    const updatedUser: User = { ...mockUser, hasCompletedOnboarding: true }

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser } as Response)       // initial fetchUser
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)            // complete-onboarding POST
      .mockResolvedValueOnce({ ok: true, json: async () => updatedUser } as Response)     // refresh fetchUser

    global.fetch = fetchSpy

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.user).toEqual(mockUser))

    await result.current.completeOnboarding()

    await waitFor(() => expect(result.current.user).toEqual(updatedUser))

    // Verify the POST was made to the right URL
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/me/complete-onboarding',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws when the complete-onboarding endpoint returns a non-ok response', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser } as Response)
      .mockResolvedValueOnce({ ok: false, status: 400 } as Response)

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.user).toEqual(mockUser))

    await expect(result.current.completeOnboarding()).rejects.toThrow('Failed to complete onboarding')
  })

  it('throws when the complete-onboarding fetch rejects with a network error', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser } as Response)
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.user).toEqual(mockUser))

    await expect(result.current.completeOnboarding()).rejects.toThrow('Network error')
  })

  // ── refetch ──────────────────────────────────────────────────────────────────

  it('exposes a refetch function that re-calls the /me endpoint', async () => {
    mockUseAuth.mockReturnValue(makeAuthContext())
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    } as Response)
    global.fetch = fetchSpy

    const { result } = renderHook(() => useUser())

    await waitFor(() => expect(result.current.user).toEqual(mockUser))

    const initialCallCount = fetchSpy.mock.calls.length

    await result.current.refetch()

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount)
  })
})
