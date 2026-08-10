import type { ReactNode } from 'react'

type AlertVariant = 'error' | 'success' | 'info'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  error: 'bg-kahoot-red border-b-8 border-[#9a0f28]',
  success: 'bg-kahoot-green border-b-8 border-[#155506]',
  info: 'bg-kahoot-blue border-b-8 border-[#0b3f85]',
}

export function Alert({ variant = 'error', children, className = '' }: AlertProps) {
  if (!children) {
    return null
  }
  return (
    <div
      role="alert"
      className={['rounded-2xl px-5 py-3 font-bold text-white', variantClasses[variant], className].join(' ')}
    >
      {children}
    </div>
  )
}
