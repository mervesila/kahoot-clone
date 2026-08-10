export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function optionLetter(index: number): string {
  return OPTION_LETTERS[
    ((index % OPTION_LETTERS.length) + OPTION_LETTERS.length) % OPTION_LETTERS.length
  ];
}

export function sortOptionsById<T extends { optionId: string }>(options: T[]): T[] {
  return [...options].sort((a, b) =>
    a.optionId < b.optionId ? -1 : a.optionId > b.optionId ? 1 : 0,
  );
}

export const OPTION_CLASS: Record<number, string> = {
  0: 'opt-red',
  1: 'opt-blue',
  2: 'opt-yellow',
  3: 'opt-green',
};

export function optionClass(index: number): string {
  return OPTION_CLASS[((index % 4) + 4) % 4];
}
