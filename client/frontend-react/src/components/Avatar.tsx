import type { CSSProperties } from 'react'

interface AvatarProps {
  emoji: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-9 w-9 text-lg',
  md: 'h-14 w-14 text-3xl',
  lg: 'h-20 w-20 text-5xl',
  xl: 'h-28 w-28 text-7xl',
}

export function Avatar({ emoji, color, size = 'md', ring, className = '' }: AvatarProps) {
  const style: CSSProperties = {
    backgroundColor: color,
    boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
  }
  return (
    <div
      style={style}
      className={[
        'grid shrink-0 place-items-center rounded-full',
        ring ? 'ring-4 ring-white/90' : '',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      <span className="translate-y-[2px] drop-shadow">{emoji}</span>
    </div>
  )
}
