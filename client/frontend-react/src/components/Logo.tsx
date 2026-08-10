export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`grid place-items-center rounded-2xl bg-white ${size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-11 h-11' : 'w-8 h-8'} shadow-[0_4px_0_rgba(0,0,0,0.25)]`}>
        <span className={size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm'}>
          🎮
        </span>
      </div>
      <div className={`font-bold tracking-tight ${sizes[size]}`}>
        <span className="text-white">TKİ</span>{' '}
        <span className="text-kahoot-yellow">Kahoot</span>
      </div>
    </div>
  )
}
