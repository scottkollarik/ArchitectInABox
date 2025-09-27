import React, { forwardRef, KeyboardEvent } from 'react'

export type ToggleSwitchSize = 'sm' | 'md'

export interface ToggleSwitchProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: ToggleSwitchSize
  ariaLabel?: string
  ariaLabelledBy?: string
}

const sizeConfig: Record<ToggleSwitchSize, { track: string; knob: string; translateChecked: string; translateUnchecked: string }> = {
  md: {
    track: 'w-11 h-6',
    knob: 'w-5 h-5',
    translateChecked: 'translate-x-5',
    translateUnchecked: 'translate-x-0'
  },
  sm: {
    track: 'w-9 h-5',
    knob: 'w-4 h-4',
    translateChecked: 'translate-x-4',
    translateUnchecked: 'translate-x-0'
  }
}

const ToggleSwitch = forwardRef<HTMLButtonElement, ToggleSwitchProps>(({
  id,
  checked,
  onChange,
  disabled = false,
  className = '',
  size = 'md',
  ariaLabel,
  ariaLabelledBy
}, ref) => {
  const config = sizeConfig[size]

  const handleToggle = () => {
    if (disabled) return
    onChange(!checked)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  const trackClasses = [
    'relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
    config.track,
    checked ? 'bg-azure-blue-500 dark:bg-azure-blue-600' : 'bg-architect-gray-300 dark:bg-gray-700',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className
  ].join(' ')

  const knobClasses = [
    'absolute top-0.5 left-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out',
    config.knob,
    checked ? config.translateChecked : config.translateUnchecked
  ].join(' ')

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={trackClasses}
      ref={ref}
    >
      <span className="sr-only">Toggle</span>
      <span aria-hidden="true" className={knobClasses} />
    </button>
  )
})

ToggleSwitch.displayName = 'ToggleSwitch'

export default ToggleSwitch
