export interface Avatar {
  emoji: string
  color: string
}

export const AVATAR_EMOJIS = [
  '🦊',
  '🐼',
  '🦁',
  '🐸',
  '🐵',
  '🦄',
  '🐯',
  '🐶',
  '🐱',
  '🐰',
  '🐻',
  '🐨',
  '🐷',
  '🦉',
  '🐙',
  '🐳',
]

export const AVATAR_COLORS = [
  { name: 'Kırmızı', value: '#e21b3c' },
  { name: 'Mavi', value: '#1368ce' },
  { name: 'Sarı', value: '#d89e00' },
  { name: 'Yeşil', value: '#26890c' },
  { name: 'Turuncu', value: '#f27e1a' },
  { name: 'Mor', value: '#7d3fbf' },
  { name: 'Pembe', value: '#e45d9c' },
  { name: 'Turkuaz', value: '#0ea5a0' },
]

export const DEFAULT_AVATAR: Avatar = { emoji: '🦊', color: AVATAR_COLORS[0].value }

export const AVATAR_BY_NAME: Record<string, string> = {
  'Kırmızı': '#e21b3c',
  'Mavi': '#1368ce',
  'Sarı': '#d89e00',
  'Yeşil': '#26890c',
  'Turuncu': '#f27e1a',
  'Mor': '#7d3fbf',
  'Pembe': '#e45d9c',
  'Turkuaz': '#0ea5a0',
}
