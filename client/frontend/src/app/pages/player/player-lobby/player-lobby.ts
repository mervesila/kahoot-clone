import { Component, ChangeDetectorRef, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AvatarComponent } from '../../../shared/avatar/avatar';
import { LogoComponent } from '../../../shared/logo/logo';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { RelayService } from '../../../services/relay.service';
import { SessionService, type PlayerSession } from '../../../services/session.service';
import { environment } from '../../../../environments/environment';
import type { GameFinishedEvent } from '../../../models/types';

@Component({
  selector: 'app-player-lobby',
  imports: [AvatarComponent, LogoComponent, MatButtonModule, SoundToggleComponent, SpinnerComponent],
  templateUrl: './player-lobby.html',
  styleUrl: './player-lobby.scss',
})
export class PlayerLobbyComponent {
  private readonly router = inject(Router);
  private readonly sessions = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly hub = inject(GameHubService);
  private readonly audio = inject(AudioService);
  private readonly relay = inject(RelayService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = signal<PlayerSession | null>(null);
  readonly wrongPin = signal(false);

  constructor() {
    const stored = this.sessions.loadPlayer();
    if (!stored) {
      void this.router.navigate(['/player'], { replaceUrl: true });
      return;
    }
    this.session.set(stored);
    this.audio.playMusic('lobby');

    // Yanlış PIN kontrolü: 15 saniye içinde host'tan yanıt gelmezse hata göster.
    const initialSessionId = stored.sessionId;
    const wrongPinTimer = setTimeout(() => {
      const current = this.sessions.loadPlayer();
      if (current && current.sessionId === initialSessionId && current.sessionId.startsWith('relay-')) {
        this.wrongPin.set(true);
        this.cdr.detectChanges();
      }
    }, 15000);

    let relayDisconnect: (() => void) | null = null;
    if (environment.demo) {
      relayDisconnect = this.relay.connect(stored.pinCode, false, (msg) => {
        const current = this.sessions.loadPlayer();
        if (!current) {
          return;
        }
        // Host'tan yanıt geldi — wrongPin timer'ını iptal et.
        if (msg.type === 'announce' || msg.type === 'accept' || msg.type === 'state') {
          clearTimeout(wrongPinTimer);
          this.wrongPin.set(false);
        }
        if (msg.type === 'announce' && msg.pinCode === stored.pinCode) {
          this.sessions.savePlayer({
            ...current,
            sessionId: msg.sessionId,
            quizTitle: msg.quizTitle,
          });
        } else if (msg.type === 'accept' && msg.sessionId && current.sessionId !== msg.sessionId) {
          this.sessions.savePlayer({ ...current, sessionId: msg.sessionId });
        } else if (msg.type === 'state' && current.sessionId !== msg.sessionId) {
          this.sessions.savePlayer({ ...current, sessionId: msg.sessionId });
        }
      });
    }

    const goToGame = (): void => {
      clearTimeout(wrongPinTimer);
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
      clearTimeout(wrongPinTimer);
      clearInterval(poll);
      relayDisconnect?.();
      this.audio.stopMusic();
    });
  }

  async retryJoin(): Promise<void> {
    this.sessions.clearPlayer();
    await this.router.navigate(['/player'], { replaceUrl: true });
  }
}
