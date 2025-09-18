import React from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface InfoTooltipProps {
  title: string
  description?: string
  bullets?: { label?: string; text: string }[]
  className?: string
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, description, bullets, className }) => (
  <span className={`relative inline-flex ${className ?? ''}`}>
    <button
      type="button"
      className="group inline-flex h-5 w-5 items-center justify-center text-gray-400 transition-colors duration-150 hover:text-azure-blue-600 focus-visible:text-azure-blue-600 focus-visible:outline-none"
      aria-label={title}
    >
      <InformationCircleIcon className="h-4 w-4" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 rounded-md bg-slate-900/95 px-3 py-2 text-left text-xs text-white opacity-0 shadow-lg ring-1 ring-black/20 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="block text-sm font-medium text-white">{title}</span>
        {description && (
          <span className="mt-1 block text-[11px] leading-relaxed text-slate-100/90">{description}</span>
        )}
        {bullets?.length ? (
          <ul className="mt-2 space-y-1">
            {bullets.map((item, index) => (
              <li key={`${item.label ?? index}`} className="flex gap-1 text-[11px] leading-relaxed text-slate-100/80">
                {item.label ? (
                  <span className="font-medium text-white">{item.label}:</span>
                ) : null}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </span>
    </button>
  </span>
)

export default InfoTooltip
