import type { InputHTMLAttributes } from 'react'

interface KahootInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  inputClassName?: string
}

export function KahootInput({
  label,
  error,
  className = '',
  inputClassName = '',
  ...rest
}: KahootInputProps) {
  return (
    <label className={`block text-left ${className}`}>
      {label ? (
        <span className="mb-1.5 block font-bold uppercase tracking-wide text-sm text-white/90">
          {label}
        </span>
      ) : null}
      <input
        className={[
          'w-full rounded-2xl border-4 px-5 py-3.5 text-lg font-bold outline-none',
          'bg-white text-kahoot-purple placeholder:text-kahoot-light/50',
          'focus:border-kahoot-yellow',
          error ? 'border-kahoot-red' : 'border-transparent',
          inputClassName,
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <span className="mt-1 block text-sm font-bold text-kahoot-yellow">{error}</span>
      ) : null}
    </label>
  )
}
