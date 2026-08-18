import { Component, ChangeDetectorRef, computed, DestroyRef, inject, NgZone, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AlertComponent } from '../../../shared/alert/alert';
import { AvatarComponent } from '../../../shared/avatar/avatar';
import { LogoComponent } from '../../../shared/logo/logo';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiError, ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { SessionService, type HostSession } from '../../../services/session.service';
import { RelayService } from '../../../services/relay.service';
import { DEFAULT_AVATAR } from '../../../data/avatars';
import { environment } from '../../../../environments/environment';
import { getNtfySseUrl, getNtfyPublishUrl } from '../../../shared/ntfy-channel.util';
import type {
  PlayerAvatarUpdatedEvent,
  PlayerJoinedEvent,
  RoomPlayersUpdatedEvent,
  SessionParticipantDto,
} from '../../../models/types';

interface LobbyPlayer {
  playerId: string;
  name: string;
  teamName: string | null;
  emoji: string;
  color: string;
}

@Component({
  selector: 'app-host-lobby',
  imports: [
    AlertComponent,
    AvatarComponent,
    LogoComponent,
    MatButtonModule,
    RouterLink,
    SoundToggleComponent,
    SpinnerComponent,
  ],
  templateUrl: './host-lobby.html',
  styleUrl: './host-lobby.scss',
})
export class HostLobbyComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly hub = inject(GameHubService);
  private readonly sessions = inject(SessionService);
  private readonly relay = inject(RelayService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  readonly host = signal<HostSession | null>(null);
  readonly players = signal<LobbyPlayer[]>([]);
  readonly error = signal('');
  readonly starting = signal(false);

  private eventSource: EventSource | null = null;
  private pollFallbackHandle: ReturnType<typeof setInterval> | null = null;
  private pollSince = Math.floor(Date.now() / 1000);

  readonly qrJoinUrl = computed(() => {
    const host = this.host();
    return host ? `${window.location.origin}/join?pin=${host.pinCode}` : '';
  });

  readonly qrImageUrl = computed(() => {
    const host = this.host();
    if (!host) {
      return '';
    }
    const target = encodeURIComponent(this.qrJoinUrl());
    return `https://api.quickchart.io/qr?text=${target}&size=240&margin=2`;
  });

  constructor() {
    const sessionId = this.route.snapshot.paramMap.get('sessionId') ?? '';
    const stored = this.sessions.loadHost();
    if (!stored || stored.sessionId !== sessionId) {
      void this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      return;
    }
    this.host.set(stored);
    this.audio.playMusic('lobby');

    this.hub.playerJoined$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: PlayerJoinedEvent) => {
        if (event.sessionId === sessionId) {
          this.upsertPlayer({
            playerId: event.playerId,
            name: event.playerName,
            teamName: event.teamName,
            ...DEFAULT_AVATAR,
          });
        }
      });

    this.hub.roomPlayersUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: RoomPlayersUpdatedEvent) => {
        if (event.sessionId === sessionId) {
          this.players.set(event.players.map((p) => this.toLobbyPlayer(p)));
        }
      });

    this.hub.playerAvatarUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: PlayerAvatarUpdatedEvent) => {
        if (event.sessionId === sessionId) {
          const existing = this.players().find((p) => p.playerId === event.playerId);
          this.upsertPlayer({
            playerId: event.playerId,
            name: existing?.name ?? 'Oyuncu',
            teamName: existing?.teamName ?? null,
            emoji: event.emoji,
            color: event.color,
          });
        }
      });

    if (!environment.demo) {
      void this.hub
        .getConnection()
        .then(() => this.hub.joinGameGroup(sessionId))
        .catch(() => this.error.set('Canlı sunucuya bağlanılamadı.'));
    }

    if (environment.demo) {
      this.startListening(stored.pinCode);
    }

    this.destroyRef.onDestroy(() => this.audio.stopMusic());
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
    this.eventSource = null;
    if (this.pollFallbackHandle) {
      clearInterval(this.pollFallbackHandle);
      this.pollFallbackHandle = null;
    }
  }

  private startListening(pin: string): void {
    const sseUrl = getNtfySseUrl(pin);

    // EventSource is created OUTSIDE Angular's zone to avoid excessive
    // change-detection churn; each handler re-enters the zone explicitly.
    this.ngZone.runOutsideAngular(() => {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleNtfyMessage(event.data, pin);
      };

      this.eventSource.onerror = () => {
        console.warn('[ntfy] SSE error, falling back to polling');
        this.eventSource?.close();
        this.eventSource = null;
        this.ngZone.run(() => this.startPollingFallback(pin));
      };
    });
  }

  private handleNtfyMessage(rawEventData: string, pin: string): void {
    try {
      // Strategy 1: ntfy SSE envelope — { id, time, event, topic, message, ... }
      // Strategy 2: raw JSON payload (message IS the payload)
      // Strategy 3: message is a JSON string that needs double-parse
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
        // rawEventData is the payload directly
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

      // Re-enter Angular's zone so change detection actually runs
      this.ngZone.run(() => {
        this.upsertPlayer({
          playerId: String(player.id ?? Date.now()),
          name: player.name ?? 'Oyuncu',
          teamName: (payload!['teamName'] as string | null) ?? null,
          emoji: String(payload!['avatarEmoji'] ?? '').trim() || DEFAULT_AVATAR.emoji,
          color: String(payload!['avatarColor'] ?? '').trim() || DEFAULT_AVATAR.color,
        });
        this.cdr.detectChanges();

        // Telefonun kullanacağı sessionId'yi otomatik olarak kabul et
        void this.relay.publish(pin, {
          type: 'accept',
          sessionId: String(payload!['sessionId'] ?? ''),
          playerName: player.name ?? 'Oyuncu',
        });
      });
    } catch (e) {
      console.error('[ntfy] Failed to parse incoming message', rawEventData, e);
    }
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
        console.error('[ntfy] Polling fallback failed', e);
      }
    }, 1500);
  }

  private upsertPlayer(player: LobbyPlayer): void {
    this.players.update((prev) => {
      const index = prev.findIndex((p) => p.playerId === player.playerId);
      if (index === -1) {
        return [...prev, player];
      }
      const next = [...prev];
      next[index] = { ...next[index], ...player };
      return next;
    });
  }

  private toLobbyPlayer(p: SessionParticipantDto): LobbyPlayer {
    const emoji = p.avatarEmoji?.trim() && p.avatarEmoji !== '❓' ? p.avatarEmoji : DEFAULT_AVATAR.emoji;
    const color = p.avatarColor?.trim() ? p.avatarColor : DEFAULT_AVATAR.color;
    return {
      playerId: p.playerId,
      name: p.playerName,
      teamName: p.teamName,
      emoji,
      color,
    };
  }

  async handleStart(): Promise<void> {
    const host = this.host();
    if (!host) {
      return;
    }
    this.error.set('');
    this.starting.set(true);
    try {
      await this.api.startSession(host.sessionId);
      await this.router.navigate(['/admin/host', host.sessionId, 'control']);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        await this.router.navigate(['/admin/host', host.sessionId, 'control']);
        return;
      }
      this.error.set(err instanceof ApiError ? err.message : 'Oyun başlatılamadı.');
    } finally {
      this.starting.set(false);
    }
  }
}
