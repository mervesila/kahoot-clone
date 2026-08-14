import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { DEFAULT_AVATAR } from '../../../data/avatars';
import { environment } from '../../../../environments/environment';
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
export class HostLobbyComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly hub = inject(GameHubService);
  private readonly sessions = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly host = signal<HostSession | null>(null);
  readonly players = signal<LobbyPlayer[]>([]);
  readonly error = signal('');
  readonly starting = signal(false);

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

    void this.api
      .getParticipants(sessionId)
      .then((list) => {
        this.players.set(list.map((p) => this.toLobbyPlayer(p)));
      })
      .catch(() => undefined);

    this.destroyRef.onDestroy(() => this.audio.stopMusic());
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
