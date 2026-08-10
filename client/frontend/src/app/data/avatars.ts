export interface Avatar {
  emoji: string;
  color: string;
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
];

export const AVATAR_COLORS = [
  { name: 'Magenta', value: '#e2257b' },
  { name: 'Safir', value: '#2b6cff' },
  { name: 'Kehribar', value: '#f59e0b' },
  { name: 'Zümrüt', value: '#10b981' },
  { name: 'Turuncu', value: '#f97316' },
  { name: 'Mor', value: '#8b5cf6' },
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Turkuaz', value: '#14b8a6' },
];

export const DEFAULT_AVATAR: Avatar = { emoji: '🦊', color: AVATAR_COLORS[0].value };

export const PENDING_AVATAR = { emoji: '❓', color: '#866ecb' };
