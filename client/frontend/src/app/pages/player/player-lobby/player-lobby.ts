import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '../../../shared/avatar/avatar';
import { LogoComponent } from '../../../shared/logo/logo';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { SessionService, type PlayerSession } from '../../../services/session.service';
import type { GameFinishedEvent } from '../../../models/types';

@Component({
  selector: 'app-player-lobby',
  imports: [AvatarComponent, LogoComponent, SoundToggleComponent],
  templateUrl: './player-lobby.html',
  styleUrl: './player-lobby.scss',
})
export class PlayerLobbyComponent {
  private readonly router = inject(Router);
  private readonly sessions = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly hub = inject(GameHubService);
  private readonly audio = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = signal<PlayerSession | null>(null);

  constructor() {
    const stored = this.sessions.loadPlayer();
    if (!stored) {
      void this.router.navigate(['/player'], { replaceUrl: true });
      return;
    }
    this.session.set(stored);
    this.audio.playMusic('lobby');

    const goToGame = (): void => {
      void this.router.navigate(['/player/game']);
    };

    this.hub.gameStarted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => goToGame());

    this.hub.questionStarted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => goToGame());

    this.hub.gameFinished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: GameFinishedEvent) => {
        if (this.sessions.loadPlayer()?.sessionId === event.sessionId) {
          goToGame();
        }
      });

    void this.hub.getConnection().catch(() => {
      // Bağlantı kurulamazsa kullanıcı lobide kalır
    });

    const checkState = async (): Promise<void> => {
      const current = this.sessions.loadPlayer();
      if (!current) {
        return;
      }
      try {
        const state = await this.api.getSessionState(current.sessionId);
        if (state.status === 'InGame' || state.status === 'Finished') {
          goToGame();
        }
      } catch {
        // durum alınamazsa beklemeye devam edilir
      }
    };

    void checkState();
    const poll = setInterval(() => void checkState(), 3000);

    this.destroyRef.onDestroy(() => {
      clearInterval(poll);
      this.audio.stopMusic();
    });
  }
}
