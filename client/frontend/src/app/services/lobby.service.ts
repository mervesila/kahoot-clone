import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { RelayService } from './relay.service';
import { getNtfyPublishUrl, getNtfySseUrl } from '../shared/ntfy-channel.util';
import { DEFAULT_AVATAR } from '../data/avatars';

export interface LobbyPlayer {
  playerId: string;
  name: string;
  teamName: string | null;
  emoji: string;
  color: string;
}

export type PlayerUpdateCallback = (players: LobbyPlayer[]) => void;

/**
 * LOBBY SERVİSİ — Sadece PIN, QR, PLAYER_JOINED ve katılımcı listesi.
 *
 * Bu servis SADECE lobiyle ilgilenir:
 * - ntfy.sh SSE/polling dinler
 * - PLAYER_JOINED mesajlarını işler
 * - Katılımcı listesini tutar
 * - Accept mesajları yayınlar
 *
 * Oyun durumu (GAME_STARTED, NEXT_QUESTION) bu servise DOKUNMAZ.
 * Cevap doğrulama bu servise DOKUNMAZ.
 */
@Injectable({ providedIn: 'root' })
export class LobbyService implements OnDestroy {
  private readonly relay = inject(RelayService);
  private readonly ngZone = inject(NgZone);

  private eventSource: EventSource | null = null;
  private pollFallbackHandle: ReturnType<typeof setInterval> | null = null;
  private pollSince = Math.floor(Date.now() / 1000);
  private readonly callbacks = new Set<PlayerUpdateCallback>();
  private readonly participantsMap = new Map<string, LobbyPlayer[]>();

  ngOnDestroy(): void {
    this.stopListening();
  }

  /**
   * ntfy.sh kanalını SSE ile dinlemeye başla.
   * Her PLAYER_JOINED mesajında tüm kayıtlı callback'leri çağırır.
   */
  startListening(pin: string): void {
    this.stopListening();
    this.pollSince = Math.floor(Date.now() / 1000);
    const sseUrl = getNtfySseUrl(pin);

    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleNtfyMessage(event.data, pin);
      };

      this.eventSource.onerror = () => {
        console.warn('[lobby-service] SSE error, falling back to polling');
        this.eventSource?.close();
        this.eventSource = null;
        this.ngZone.run(() => this.startPollingFallback(pin));
      };
    });
  }

  stopListening(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.pollFallbackHandle) {
      clearInterval(this.pollFallbackHandle);
      this.pollFallbackHandle = null;
    }
  }

  /**
   * Bu pin için mevcut katılımcı listesini döndür.
   */
  getParticipants(pin: string): LobbyPlayer[] {
    return this.participantsMap.get(pin) ?? [];
  }

  /**
   * Katılımcı listesi değiştiğinde çağrılacak callback kaydet.
   */
  onPlayersUpdate(callback: PlayerUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(pin: string): void {
    const players = this.participantsMap.get(pin) ?? [];
    this.callbacks.forEach((cb) => cb(players));
  }

  private handleNtfyMessage(rawEventData: string, pin: string): void {
    try {
      let payload: Record<string, unknown> | null = null;

      try {
        const envelope = JSON.parse(rawEventData) as Record<string, unknown>;
        const msg = envelope['message'];
        if (typeof msg === 'string' && msg.startsWith('{')) {
          payload = JSON.parse(msg) as Record<string, unknown>;
        } else if (typeof msg === 'object' && msg !== null) {
          payload = msg as Record<string, unknown>;
        } else if (envelope['type']) {
          payload = envelope;
        }
      } catch {
        try {
          payload = JSON.parse(rawEventData) as Record<string, unknown>;
        } catch {
          return;
        }
      }

      if (!payload || payload['type'] !== 'PLAYER_JOINED') {
        return;
      }

      const player = payload['player'] as { id?: number | string; name?: string } | undefined;
      if (!player) {
        return;
      }

      this.ngZone.run(() => {
        this.upsertPlayer(pin, {
          playerId: String(player.id ?? Date.now()),
          name: player.name ?? 'Oyuncu',
          teamName: (payload!['teamName'] as string | null) ?? null,
          emoji: String(payload!['avatarEmoji'] ?? '').trim() || DEFAULT_AVATAR.emoji,
          color: String(payload!['avatarColor'] ?? '').trim() || DEFAULT_AVATAR.color,
        });

        void this.relay.publish(pin, {
          type: 'accept',
          sessionId: String(payload!['sessionId'] ?? ''),
          playerName: player.name ?? 'Oyuncu',
        });
      });
    } catch (e) {
      console.error('[lobby-service] Failed to parse message', e);
    }
  }

  private upsertPlayer(pin: string, player: LobbyPlayer): void {
    const list = this.participantsMap.get(pin) ?? [];
    const index = list.findIndex((p) => p.playerId === player.playerId);
    if (index === -1) {
      list.push(player);
    } else {
      list[index] = { ...list[index], ...player };
    }
    this.participantsMap.set(pin, list);
    this.notifyCallbacks(pin);
  }

  private startPollingFallback(pin: string): void {
    const publishBase = getNtfyPublishUrl(pin);

    this.pollFallbackHandle = setInterval(async () => {
      try {
        const pollUrl = `${publishBase}/json?poll=1&since=${this.pollSince}`;
        const res = await fetch(pollUrl);
        const text = await res.text();
        let latestTime = this.pollSince;
        text
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .forEach((line) => {
            try {
              const parsed = JSON.parse(line) as { time?: number };
              if (parsed.time && parsed.time > latestTime) {
                latestTime = parsed.time;
              }
            } catch { /* ignore */ }
            this.handleNtfyMessage(line, pin);
          });
        this.pollSince = latestTime + 1;
      } catch (e) {
        console.error('[lobby-service] Polling fallback failed', e);
      }
    }, 1500);
  }
}
