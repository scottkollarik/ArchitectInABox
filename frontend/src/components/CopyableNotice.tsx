import React, { useState } from 'react'

type Variant = 'success' | 'error' | 'info' | 'warning'

const variantClasses: Record<Variant, { root: string; button: string; title: string }> = {
  success: {
    root: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
    button: 'border-green-300 text-green-800 bg-white hover:bg-green-50 dark:border-green-600 dark:text-green-200 dark:bg-gray-900 dark:hover:bg-green-900/30',
    title: 'text-green-900 dark:text-green-200'
  },
  error: {
    root: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
    button: 'border-red-300 text-red-800 bg-white hover:bg-red-50 dark:border-red-600 dark:text-red-200 dark:bg-gray-900 dark:hover:bg-red-900/30',
    title: 'text-red-900 dark:text-red-200'
  },
  info: {
    root: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200',
    button: 'border-blue-300 text-blue-800 bg-white hover:bg-blue-50 dark:border-blue-600 dark:text-blue-200 dark:bg-gray-900 dark:hover:bg-blue-900/30',
    title: 'text-blue-900 dark:text-blue-200'
  },
  warning: {
    root: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200',
    button: 'border-amber-300 text-amber-800 bg-white hover:bg-amber-50 dark:border-amber-600 dark:text-amber-200 dark:bg-gray-900 dark:hover:bg-amber-900/30',
    title: 'text-amber-900 dark:text-amber-200'
  }
}

interface CopyableNoticeProps {
  variant?: Variant
  title?: string
  message: string
  details?: string
  className?: string
}

const CopyableNotice: React.FC<CopyableNoticeProps> = ({
  variant = 'info',
  title,
  message,
  details,
  className = ''
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const payload = [message, details].filter(Boolean).join('\n\n')
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // no-op
    }
  }

  const v = variantClasses[variant]
  return (
    <div className={`p-2 rounded border text-xs ${v.root} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`font-medium ${v.title}`}>{title || (variant === 'success' ? 'Success' : variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Info')}</div>
        <div className="flex items-center gap-2">
          {copied && <span className="text-[10px] opacity-80">Copied</span>}
          <button onClick={handleCopy} className={`ml-2 px-2 py-0.5 border rounded transition-colors ${v.button}`}>Copy</button>
        </div>
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words">{message}</div>
      {details && (
        <pre className="mt-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto rounded bg-white/60 dark:bg-gray-900/60 p-2">{details}</pre>
      )}
    </div>
  )
}

export default CopyableNotice
