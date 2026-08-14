import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface RelayAnnounce {
  sessionId: string;
  quizTitle: string;
  pinCode: string;
}

export interface RelayJoin {
  sessionId: string;
  playerId: string;
  playerName: string;
  teamName: string | null;
  avatarEmoji: string;
  avatarColor: string;
}

export interface RelayState {
  sessionId: string;
  status: 'Waiting' | 'InGame' | 'Finished';
  currentQuestionOrderNo: number;
}

export interface RelayReject {
  sessionId: string;
  playerName: string;
  message: string;
}

export interface RelayAccept {
  sessionId: string;
  playerName: string;
}

export interface RelayRequest {
  pinCode: string;
}

export interface RelayGameOption {
  optionId: string;
  text: string;
}

export interface RelayGameState {
  sessionId: string;
  pinCode: string;
  status: 'QUESTION' | 'GAME_OVER';
  questionIndex: number;
  questionData?: {
    questionId: string;
    text: string;
    orderNo: number;
    totalQuestions: number;
    timeLimitInSeconds: number;
    points: number;
    options: RelayGameOption[];
    jokersEnabled?: boolean;
  };
}

export type RelayMessage =
  | ({ type: 'announce' } & RelayAnnounce)
  | ({ type: 'join' } & RelayJoin)
  | ({ type: 'state' } & RelayState)
  | ({ type: 'reject' } & RelayReject)
  | ({ type: 'accept' } & RelayAccept)
  | ({ type: 'request' } & RelayRequest)
  | ({ type: 'game' } & RelayGameState);

const HUB_HTTPS = environment.relayUrl;
const HUB_WSS = environment.relayWssUrl;

interface RelayChannel {
  ws: WebSocket | null;
  keepAlive: boolean;
  leases: number;
  handlers: Set<(msg: RelayMessage) => void>;
  reconnectTimer: number | null;
  closed: boolean;
}

/**
 * Cihazlar arası canlı senkronizasyon rölesi.
 * Ücretsiz public relay (ntfy.sh) üzerinden PIN'e özel topic'lerde
 * announce / join / state / reject mesajları yayınlanır ve dinlenir.
 * Demo modunda (environment.demo) farklı cihazlar (telefon + bilgisayar)
 * localStorage paylaşamadığı için bu röle üzerinden haberleşir.
 */
@Injectable({ providedIn: 'root' })
export class RelayService {
  private readonly channels = new Map<string, RelayChannel>();
  private readonly announced = new Map<string, RelayAnnounce>();
  private readonly remoteStates = new Map<string, RelayState>();
  private readonly gameStates = new Map<string, RelayGameState>();
  private readonly rejects: RelayReject[] = [];
  private readonly accepts: RelayAccept[] = [];

  topicFor(pinCode: string): string {
    return `tki-kahoot-pin-${pinCode}`;
  }

  getAnnounced(pinCode: string): RelayAnnounce | null {
    return this.announced.get(pinCode) ?? null;
  }

  getRemoteState(sessionId: string): RelayState | null {
    return this.remoteStates.get(sessionId) ?? null;
  }

  getLatestGameState(pinCode: string): RelayGameState | null {
    return this.gameStates.get(this.topicFor(pinCode)) ?? null;
  }

  /**
   * ntfy HTTP endpoint'inden ({topic}/json?poll=1) son yayınlanan oyun
   * durumunu (QUESTION / GAME_OVER) çeker. Relay/websocket kaçsa bile
   * telefon bu çağrı ile güncel durumu garantili alır.
   */
  async fetchLatestGameState(pinCode: string): Promise<RelayGameState | null> {
    const topic = this.topicFor(pinCode);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${HUB_HTTPS}/${topic}/json?poll=1&since=all`, {
          signal: controller.signal,
          headers: { Accept: 'application/x-ndjson' },
        });
        if (!response.ok || !response.body) {
          return this.getLatestGameState(pinCode);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let latest: RelayGameState | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) {
              continue;
            }
            let frame: { event?: string; message?: string };
            try {
              frame = JSON.parse(line) as { event?: string; message?: string };
            } catch {
              continue;
            }
            if (frame.event !== 'message' || typeof frame.message !== 'string') {
              continue;
            }
            let msg: RelayMessage;
            try {
              msg = JSON.parse(frame.message) as RelayMessage;
            } catch {
              continue;
            }
            if (msg?.type === 'game') {
              latest = msg;
            }
          }
        }
        if (latest) {
          this.gameStates.set(topic, latest);
          return latest;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // ağ hatası / abort: sessizce geç, bir sonraki poll dener
    }
    return this.getLatestGameState(pinCode);
  }

  takeReject(playerName: string): RelayReject | null {
    const normalized = playerName.toLocaleLowerCase('tr-TR');
    const index = this.rejects.findIndex(
      (r) => r.playerName.toLocaleLowerCase('tr-TR') === normalized,
    );
    if (index === -1) {
      return null;
    }
    const [reject] = this.rejects.splice(index, 1);
    return reject;
  }

  takeAccept(playerName: string): RelayAccept | null {
    const normalized = playerName.toLocaleLowerCase('tr-TR');
    const index = this.accepts.findIndex(
      (a) => a.playerName.toLocaleLowerCase('tr-TR') === normalized,
    );
    if (index === -1) {
      return null;
    }
    const [accept] = this.accepts.splice(index, 1);
    return accept;
  }

  connect(pinCode: string, keepAlive = false, handler?: (msg: RelayMessage) => void): () => void {
    const topic = this.topicFor(pinCode);
    let channel = this.channels.get(topic);
    if (!channel) {
      channel = {
        ws: null,
        keepAlive: false,
        leases: 0,
        handlers: new Set(),
        reconnectTimer: null,
        closed: false,
      };
      this.channels.set(topic, channel);
    }
    if (keepAlive) {
      channel.keepAlive = true;
    }
    if (handler) {
      channel.handlers.add(handler);
    }
    channel.leases += 1;
    this.ensureOpen(topic, channel);

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      if (handler) {
        channel.handlers.delete(handler);
      }
      channel.leases -= 1;
      this.maybeClose(topic, channel);
    };
  }

  async publish(pinCode: string, message: RelayMessage): Promise<void> {
    const topic = this.topicFor(pinCode);
    try {
      await fetch(`${HUB_HTTPS}/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cache: 'no' },
        body: JSON.stringify(message),
      });
    } catch {
      // relay ulaşılamıyorsa sessizce geç (yerel akış çalışmaya devam eder)
    }
  }

  private ensureOpen(topic: string, channel: RelayChannel): void {
    if (channel.closed) {
      return;
    }
    if (channel.ws && (channel.ws.readyState === WebSocket.OPEN || channel.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const ws = new WebSocket(`${HUB_WSS}/${topic}/ws`);
    channel.ws = ws;
    ws.onmessage = (event) => this.onMessage(topic, channel, event);
    ws.onclose = () => {
      if (channel.closed) {
        return;
      }
      if (channel.reconnectTimer === null) {
        channel.reconnectTimer = window.setTimeout(() => {
          channel.reconnectTimer = null;
          if (!channel.closed) {
            this.ensureOpen(topic, channel);
          }
        }, 4000);
      }
    };
  }

  private maybeClose(topic: string, channel: RelayChannel): void {
    if (channel.keepAlive || channel.leases > 0 || channel.handlers.size > 0) {
      return;
    }
    if (channel.reconnectTimer !== null) {
      clearTimeout(channel.reconnectTimer);
      channel.reconnectTimer = null;
    }
    channel.closed = true;
    if (channel.ws) {
      channel.ws.onclose = null;
      channel.ws.close();
      channel.ws = null;
    }
    this.channels.delete(topic);
  }

  private onMessage(topic: string, channel: RelayChannel, event: MessageEvent): void {
    let raw: string;
    try {
      raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    } catch {
      return;
    }
    let frame: { event?: string; message?: string };
    try {
      frame = JSON.parse(raw) as { event?: string; message?: string };
    } catch {
      return;
    }
    if (frame.event !== 'message') {
      return;
    }
    const text = typeof frame.message === 'string' ? frame.message : '';
    if (!text) {
      return;
    }
    let msg: RelayMessage;
    try {
      msg = JSON.parse(text) as RelayMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      return;
    }
    switch (msg.type) {
      case 'announce':
        this.announced.set(msg.pinCode, msg);
        break;
      case 'state':
        this.remoteStates.set(msg.sessionId, msg);
        break;
      case 'game':
        this.gameStates.set(msg.pinCode ? this.topicFor(msg.pinCode) : msg.sessionId, msg);
        break;
      case 'reject':
        this.rejects.push(msg);
        break;
      case 'accept':
        this.accepts.push(msg);
        break;
    }
    for (const handler of channel.handlers) {
      try {
        handler(msg);
      } catch {
        // handler hataları yayını etkilememeli
      }
    }
  }
}
