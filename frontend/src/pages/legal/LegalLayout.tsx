import React, { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LegalLayoutProps {
  title: string
  effectiveDate: string
  children: ReactNode
}

/**
 * Shared shell for the public legal pages (privacy, terms). Rendered without
 * authentication so both users and search-engine/safety crawlers can read them.
 */
const LegalLayout: React.FC<LegalLayoutProps> = ({ title, effectiveDate, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Architect-in-a-Box</span>
          </div>
          <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Effective date: {effectiveDate}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-[15px]">{children}</div>

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <span className="ml-auto">© {new Date().getFullYear()} Technologoo</span>
        </footer>
      </main>
    </div>
  )
}

/** Small section heading helper for legal content. */
export const LegalSection: React.FC<{ heading: string; children: ReactNode }> = ({ heading, children }) => (
  <section>
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{heading}</h2>
    <div className="space-y-3 text-gray-700 dark:text-gray-300">{children}</div>
  </section>
)

export default LegalLayout
