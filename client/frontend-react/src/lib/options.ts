export const OPTION_SHAPES = ['▲', '◆', '●', '■'] as const

export type OptionShapeSymbol = (typeof OPTION_SHAPES)[number]

export function optionSymbol(index: number): OptionShapeSymbol {
  return OPTION_SHAPES[((index % OPTION_SHAPES.length) + OPTION_SHAPES.length) % OPTION_SHAPES.length]
}

export function sortOptionsById<T extends { optionId: string }>(options: T[]): T[] {
  return [...options].sort((a, b) =>
    a.optionId < b.optionId ? -1 : a.optionId > b.optionId ? 1 : 0,
  )
}
