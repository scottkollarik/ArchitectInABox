import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{
  theme: Theme
  effectiveTheme: 'light' | 'dark'  // What's actually applied
  setTheme: (theme: Theme) => void
}>({
  theme: 'system',
  effectiveTheme: 'light',
  setTheme: () => {}
})

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme') as Theme
      return saved || 'system'
    } catch {
      return 'system'
    }
  })

  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const effectiveTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme, effectiveTheme])

  return <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
