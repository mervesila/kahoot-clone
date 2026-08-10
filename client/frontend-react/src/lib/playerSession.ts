import type { Avatar } from './avatars'
import { DEFAULT_AVATAR } from './avatars'

export interface PlayerSession {
  sessionId: string
  pinCode: string
  quizTitle: string
  playerId: string
  playerName: string
  isTeamMode: boolean
  teamName?: string | null
  avatar: Avatar
}

const STORAGE_KEY = 'tki_player_session'

export const playerSession = {
  save(session: PlayerSession): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  },
  load(): PlayerSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    try {
      const parsed = JSON.parse(raw) as PlayerSession
      return { ...parsed, avatar: { ...DEFAULT_AVATAR, ...parsed.avatar } }
    } catch {
      return null
    }
  },
  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY)
  },
}

const CLIENT_ID_KEY = 'tki_client_id'

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = `P-${crypto.randomUUID()}`
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}
