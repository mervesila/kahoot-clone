import { Injectable } from '@angular/core';
import type { Avatar } from '../data/avatars';
import { DEFAULT_AVATAR } from '../data/avatars';

export interface HostSession {
  sessionId: string;
  quizId: string;
  pinCode: string;
  quizTitle: string;
}

export interface PlayerSession {
  sessionId: string;
  pinCode: string;
  quizTitle: string;
  playerId: string;
  playerName: string;
  teamName?: string | null;
  avatar: Avatar;
}

const HOST_KEY = 'tki_host_session';
const PLAYER_KEY = 'tki_player_session';
const CLIENT_ID_KEY = 'tki_client_id';

@Injectable({ providedIn: 'root' })
export class SessionService {
  saveHost(session: HostSession): void {
    sessionStorage.setItem(HOST_KEY, JSON.stringify(session));
  }

  loadHost(): HostSession | null {
    const raw = sessionStorage.getItem(HOST_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as HostSession;
    } catch {
      return null;
    }
  }

  clearHost(): void {
    sessionStorage.removeItem(HOST_KEY);
  }

  savePlayer(session: PlayerSession): void {
    sessionStorage.setItem(PLAYER_KEY, JSON.stringify(session));
  }

  loadPlayer(): PlayerSession | null {
    const raw = sessionStorage.getItem(PLAYER_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as PlayerSession;
      return { ...parsed, avatar: { ...DEFAULT_AVATAR, ...parsed.avatar } };
    } catch {
      return null;
    }
  }

  clearPlayer(): void {
    sessionStorage.removeItem(PLAYER_KEY);
  }

  getClientId(): string {
    let id = sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `P-${crypto.randomUUID()}`;
      sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }
}
