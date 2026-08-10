import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'white' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  red: 'bg-kahoot-red border-b-8 border-[#9a0f28] hover:bg-[#c91838]',
  blue: 'bg-kahoot-blue border-b-8 border-[#0b3f85] hover:bg-[#1157b0]',
  yellow: 'bg-kahoot-yellow border-b-8 border-[#8f6900] hover:bg-[#b98700]',
  green: 'bg-kahoot-green border-b-8 border-[#155506] hover:bg-[#1e6c0a]',
  purple: 'bg-kahoot-purple border-b-8 border-[#2d0f5c] hover:bg-[#52199e]',
  white: 'bg-white border-b-8 border-[#c4c4c4] text-kahoot-purple hover:bg-gray-100',
  ghost: 'bg-transparent text-white hover:bg-white/10 border-transparent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-lg rounded-2xl',
  lg: 'px-10 py-5 text-2xl rounded-2xl',
}

interface KahootButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  loading?: boolean
  children: ReactNode
}

export function KahootButton({
  variant = 'purple',
  size = 'md',
  full,
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: KahootButtonProps) {
  return (
    <button
      className={[
        'font-bold uppercase tracking-wide transition-transform active:translate-y-1',
        'active:border-b-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50',
        variantClasses[variant],
        sizeClasses[size],
        full ? 'w-full' : '',
        disabled || loading ? 'opacity-50 pointer-events-none saturate-50' : 'hover:-translate-y-0.5',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Lütfen bekleyin
        </span>
      ) : (
        children
      )}
    </button>
  )
}
