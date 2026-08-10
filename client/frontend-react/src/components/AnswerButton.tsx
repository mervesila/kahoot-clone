import { OptionShape } from '@/components/OptionShape'

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'muted'

interface OptionColor {
  bg: string
  border: string
  ring: string
}

const OPTION_COLORS: OptionColor[] = [
  { bg: 'bg-kahoot-red', border: 'border-[#9a0f28]', ring: 'ring-[#e21b3c]' },
  { bg: 'bg-kahoot-blue', border: 'border-[#0b3f85]', ring: 'ring-[#1368ce]' },
  { bg: 'bg-kahoot-yellow', border: 'border-[#8f6900]', ring: 'ring-[#d89e00]' },
  { bg: 'bg-kahoot-green', border: 'border-[#155506]', ring: 'ring-[#26890c]' },
]

interface AnswerButtonProps {
  index: number
  text: string
  state?: AnswerState
  disabled?: boolean
  onClick?: () => void
}

export function AnswerButton({ index, text, state = 'idle', disabled, onClick }: AnswerButtonProps) {
  const color = OPTION_COLORS[index]

  const shape =
    index % 2 === 0
      ? 'rounded-l-[50px]'
      : 'rounded-r-[50px]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative flex min-h-36 items-center gap-4 px-5 py-4 text-left',
        'border-b-8 text-xl font-black text-white transition-transform sm:text-2xl md:min-h-44 md:px-7',
        shape,
        color.bg,
        color.border,
        state === 'idle' && !disabled ? 'hover:-translate-y-1' : '',
        state === 'idle' ? '' : 'opacity-70 saturate-50',
        state === 'correct' ? 'ring-8 ring-white opacity-100' : '',
        state === 'wrong' ? 'opacity-40 grayscale' : '',
        disabled && state === 'idle' ? 'opacity-60' : '',
      ].join(' ')}
    >
      <OptionShape
        index={index}
        className="shrink-0 text-5xl drop-shadow-sm sm:text-6xl md:text-7xl"
      />
      <span className="flex-1 drop-shadow">{text}</span>
      {state === 'correct' ? (
        <span className="absolute right-4 top-2 text-3xl drop-shadow">✅</span>
      ) : null}
      {state === 'wrong' ? (
        <span className="absolute right-4 top-2 text-3xl drop-shadow">❌</span>
      ) : null}
    </button>
  )
}
