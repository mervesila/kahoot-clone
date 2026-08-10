import { optionSymbol } from '@/lib/options'

interface OptionShapeProps {
  index: number
  className?: string
}

export function OptionShape({ index, className }: OptionShapeProps) {
  return <span className={className}>{optionSymbol(index)}</span>
}
