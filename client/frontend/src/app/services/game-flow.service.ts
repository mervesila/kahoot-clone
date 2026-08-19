import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { getNtfyPublishUrl, getNtfySseUrl } from '../shared/ntfy-channel.util';

export type GameEventCallback = (payload: Record<string, unknown>) => void;

/**
 * GAME FLOW SERVİSİ — Sadece oyun durum geçişleri ve SSE dinleyicileri.
 *
 * Bu servis SADECE oyun akışıyla ilgilenir:
 * - GAME_STARTED, NEXT_QUESTION gibi durum mesajlarını yayınlar
 * - ntfy.sh SSE üzerinden bu mesajları dinler
 * - Oyun durumu değişikliklerini callback'lerle iletir
 *
 * Lobi katılımı bu servise DOKUNMAZ.
 * Cevap doğrulama bu servise DOKUNMAZ.
 */
@Injectable({ providedIn: 'root' })
export class GameFlowService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  private readonly listeners = new Map<string, { es: EventSource | null; poll: ReturnType<typeof setInterval> | null; since: number }>();
  private readonly callbacks = new Map<string, Set<GameEventCallback>>();

  ngOnDestroy(): void {
    for (const pin of this.listeners.keys()) {
      this.stopListening(pin);
    }
  }

  /**
   * Host tarafından: GAME_STARTED mesajını ntfy.sh kanalına POST et.
   */
  publishGameStarted(pin: string, currentQuestionIndex = 0): void {
    const safePin = String(pin ?? '').trim();
    const payload = {
      type: 'GAME_STARTED',
      currentQuestionIndex,
      timestamp: Date.now(),
    };

    fetch(getNtfyPublishUrl(safePin), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('[game-flow] Failed to publish GAME_STARTED', err));
  }

  /**
   * Oyuncu tarafından: ntfy.sh kanalını GAME_STARTED mesajları için dinle.
   * Mesaj geldiğinde callback çağrılır.
   */
  listenForGameEvents(pin: string, callback: GameEventCallback): () => void {
    const safePin = String(pin ?? '').trim();
    if (!this.callbacks.has(safePin)) {
      this.callbacks.set(safePin, new Set());
      this.startListening(safePin);
    }
    this.callbacks.get(safePin)!.add(callback);

    return () => {
      const cbs = this.callbacks.get(safePin);
      cbs?.delete(callback);
      if (cbs?.size === 0) {
        this.stopListening(safePin);
        this.callbacks.delete(safePin);
      }
    };
  }

  private startListening(pin: string): void {
    const state = {
      es: null as EventSource | null,
      poll: null as ReturnType<typeof setInterval> | null,
      since: Math.floor(Date.now() / 1000),
      pollActive: false,
    };
    this.listeners.set(pin, state);

    const sseUrl = getNtfySseUrl(pin);

    this.ngZone.runOutsideAngular(() => {
      state.es = new EventSource(sseUrl);

      state.es.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data, pin);
      };

      state.es.onerror = () => {
        console.warn('[game-flow] SSE error, starting polling fallback');
        state.es?.close();
        state.es = null;
        this.ngZone.run(() => this.startPolling(pin, state));
      };
    });

    // HTTP polling: her 1sn'de bir GAME_STARTED kontrolü (SSE yedekliliği)
    this.startPolling(pin, state);
  }

  private stopListening(pin: string): void {
    const state = this.listeners.get(pin);
    if (!state) {
      return;
    }
    state.es?.close();
    if (state.poll) {
      clearInterval(state.poll);
    }
    this.listeners.delete(pin);
  }

  private handleMessage(rawEventData: string, pin: string): void {
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

      if (!payload) {
        return;
      }

      const type = payload['type'] as string | undefined;
      if (type === 'GAME_STARTED' || type === 'NEXT_QUESTION' || type === 'SHOW_QUESTION' || type === 'FINISHED') {
        this.ngZone.run(() => {
          const cbs = this.callbacks.get(pin);
          cbs?.forEach((cb) => cb(payload!));
        });
      }
    } catch (e) {
      console.error('[game-flow] Failed to parse message', e);
    }
  }

  private startPolling(pin: string, state: { poll: ReturnType<typeof setInterval> | null; since: number; pollActive: boolean }): void {
    if (state.pollActive) {
      return;
    }
    state.pollActive = true;
    const publishBase = getNtfyPublishUrl(pin);

    state.poll = setInterval(async () => {
      try {
        const pollUrl = `${publishBase}/json?poll=1&since=${state.since}`;
        const res = await fetch(pollUrl);
        const text = await res.text();
        let latestTime = state.since;
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
            this.handleMessage(line, pin);
          });
        state.since = latestTime + 1;
      } catch (e) {
        console.error('[game-flow] Polling failed', e);
      }
    }, 1000);
  }
}
