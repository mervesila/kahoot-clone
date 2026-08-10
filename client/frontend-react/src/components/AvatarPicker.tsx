import { AVATAR_COLORS, AVATAR_EMOJIS, type Avatar } from '@/lib/avatars'

interface AvatarPickerProps {
  value: Avatar
  onChange: (avatar: Avatar) => void
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/10 p-4">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Karakterini Seç
        </p>
        <div className="grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ ...value, emoji })}
              className={[
                'grid aspect-square place-items-center rounded-xl text-2xl transition-transform',
                value.emoji === emoji
                  ? 'scale-110 bg-kahoot-yellow shadow-lg'
                  : 'bg-white/5 hover:bg-white/20 hover:scale-105',
              ].join(' ')}
              aria-label={`Karakter ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white/10 p-4">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Renk Seç
        </p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange({ ...value, color: color.value })}
              className={[
                'h-10 w-10 rounded-full transition-transform',
                value.color === color.value
                  ? 'scale-110 ring-4 ring-white'
                  : 'hover:scale-105',
              ].join(' ')}
              style={{ backgroundColor: color.value }}
              aria-label={`Renk ${color.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
