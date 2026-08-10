import { useState } from 'react'
import { audioManager } from '@/lib/audioManager'

interface SoundToggleProps {
  className?: string
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [muted, setMuted] = useState(() => audioManager.isMuted())

  return (
    <button
      type="button"
      onClick={() => setMuted(audioManager.toggleMuted())}
      className={[
        'grid h-11 w-11 place-items-center rounded-full bg-white/15 text-xl text-white shadow transition-transform hover:scale-105 hover:bg-white/25',
        className,
      ].join(' ')}
      aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      title={muted ? 'Sesi aç' : 'Sesi kapat'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
