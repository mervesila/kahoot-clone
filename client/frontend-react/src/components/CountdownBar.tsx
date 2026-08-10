import { useEffect, useRef, useState } from 'react'

interface CountdownBarProps {
  duration: number
  running: boolean
  onExpire?: () => void
}

export function CountdownBar({ duration, running, onExpire }: CountdownBarProps) {
  const startedAtRef = useRef<number | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (running) {
      startedAtRef.current = Date.now()
      setNow(Date.now())
    }
  }, [running])

  useEffect(() => {
    if (!running) {
      return
    }
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [running])

  const startedAt = startedAtRef.current ?? Date.now()
  const remaining = Math.max(duration - (now - startedAt) / 1000, 0)
  const percent = Math.max((remaining / duration) * 100, 0)

  useEffect(() => {
    if (running && remaining <= 0 && onExpire) {
      onExpire()
    }
  }, [running, remaining, onExpire])

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold uppercase tracking-wide text-white/80">Süre</span>
        <span
          className={[
            'grid h-12 w-12 place-items-center rounded-full text-xl font-black',
            remaining <= 5
              ? 'animate-pulse bg-kahoot-red'
              : 'bg-white text-kahoot-purple',
          ].join(' ')}
        >
          {Math.ceil(remaining)}
        </span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-white/20">
        <div
          className={[
            'h-full rounded-full transition-[width] duration-300 ease-linear',
            remaining <= 5 ? 'bg-kahoot-red' : 'bg-kahoot-yellow',
          ].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
