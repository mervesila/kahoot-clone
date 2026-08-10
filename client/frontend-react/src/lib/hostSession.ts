export interface HostSession {
  sessionId: string
  quizId: string
  pinCode: string
  quizTitle: string
  isTeamMode: boolean
}

const STORAGE_KEY = 'tki_host_session'

export const hostSession = {
  save(session: HostSession): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  },
  load(): HostSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    try {
      return JSON.parse(raw) as HostSession
    } catch {
      return null
    }
  },
  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY)
  },
}
