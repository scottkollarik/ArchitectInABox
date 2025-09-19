import React, { useMemo, useState } from 'react'
import { useAuth } from '../auth/EntraAuthProvider'

const AVATARS = [
  { id: 'blueprint', label: 'Blueprint Buddy', glyph: '📐' },
  { id: 'cloudwave', label: 'Cloud Wave', glyph: '🌤️' },
  { id: 'gearworks', label: 'Gear Works', glyph: '⚙️' },
  { id: 'spark', label: 'Spark', glyph: '⚡' },
  { id: 'retro', label: 'Retro Synth', glyph: '🎛️' },
]

const getAvatarPreference = (key: string) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return saved
  } catch {}
  return null
}

const setAvatarPreference = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const UserBadge: React.FC = () => {
  const { displayName, email, logout, isLoading, login, isAuthenticated, objectId } = useAuth()
  const [open, setOpen] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const badgeKey = useMemo(() => {
    if (objectId) return `aib-avatar-${objectId}`
    if (email) return `aib-avatar-${email}`
    return 'aib-avatar-dev'
  }, [objectId, email])

  const preferredAvatarId = useMemo(() => {
    return getAvatarPreference(badgeKey) || AVATARS[0].id
  }, [badgeKey])

  const activeAvatar = AVATARS.find(a => a.id === preferredAvatarId) || AVATARS[0]

  const initials = useMemo(() => {
    const name = displayName || email || 'Architect'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }, [displayName, email])

  const handleSelectAvatar = (id: string) => {
    setAvatarPreference(badgeKey, id)
    setShowAvatarPicker(false)
  }

  const label = displayName || 'Dev User'
  const mail = email || 'dev.user@example.com'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg" aria-hidden>
          {activeAvatar.glyph || initials}
        </span>
        <span className="hidden sm:flex flex-col items-start text-left">
          <span className="text-sm font-medium leading-tight">{label}</span>
          <span className="text-xs text-white/70 leading-tight">{mail}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-architect-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-architect-gray-100">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-azure-blue-100 text-lg">
                {activeAvatar.glyph || initials}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-architect-gray-900 truncate">{label}</div>
                <div className="text-xs text-architect-gray-500 truncate">{mail}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <button
              className="w-full text-left px-4 py-2 text-sm text-architect-gray-700 hover:bg-architect-gray-50"
              onClick={() => {
                setShowAvatarPicker(true)
                setOpen(false)
              }}
            >
              Change avatar
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-architect-gray-700 hover:bg-architect-gray-50"
              onClick={() => {
                setOpen(false)
                alert('Profile settings coming soon!')
              }}
            >
              Profile settings
            </button>
          </div>

          <div className="border-t border-architect-gray-100 px-4 py-3">
            <button
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm text-white bg-azure-blue-600 rounded-md hover:bg-azure-blue-700 disabled:opacity-50"
              onClick={() => {
                setOpen(false)
                if (isAuthenticated) {
                  logout().catch(console.error)
                } else {
                  login().catch(console.error)
                }
              }}
            >
              {isAuthenticated ? 'Sign out' : 'Sign in'}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-4 border-b border-architect-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-architect-gray-900">Choose an avatar</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="text-architect-gray-400 hover:text-architect-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {AVATARS.map(avatar => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelectAvatar(avatar.id)}
                  className={`flex flex-col items-center gap-2 px-3 py-2 border rounded-lg transition ${avatar.id === activeAvatar.id ? 'border-azure-blue-500 bg-azure-blue-50' : 'border-architect-gray-200 hover:border-azure-blue-300'}`}
                >
                  <span className="text-2xl">{avatar.glyph}</span>
                  <span className="text-xs text-architect-gray-700 text-center leading-tight">{avatar.label}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-architect-gray-100 text-right">
              <button onClick={() => setShowAvatarPicker(false)} className="px-3 py-1.5 text-sm text-architect-gray-600 hover:text-architect-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserBadge
