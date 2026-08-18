import { Component, ChangeDetectorRef, DestroyRef, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '../../../shared/avatar/avatar';
import { LogoComponent } from '../../../shared/logo/logo';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { RelayService } from '../../../services/relay.service';
import { SessionService, type PlayerSession } from '../../../services/session.service';
import { GameFlowService } from '../../../services/game-flow.service';
import { getNtfyPublishUrl } from '../../../shared/ntfy-channel.util';
import { environment } from '../../../../environments/environment';
import type { GameFinishedEvent } from '../../../models/types';

@Component({
  selector: 'app-player-lobby',
  imports: [AvatarComponent, LogoComponent, SoundToggleComponent, SpinnerComponent],
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
  private readonly gameFlow = inject(GameFlowService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
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

    const safePin = String(stored.pinCode ?? '').trim();

    const goToGame = (): void => {
      this.ngZone.run(() => {
        void this.router.navigate(['/player/game']);
        this.cdr.detectChanges();
      });
    };

    // Relay: announce/accept/state handler (session ID güncelleme)
    let relayDisconnect: (() => void) | null = null;
    if (environment.demo) {
      relayDisconnect = this.relay.connect(safePin, false, (msg) => {
        const current = this.sessions.loadPlayer();
        if (!current) {
          return;
        }
        if (msg.type === 'announce' && msg.pinCode === safePin) {
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

    // GameFlowService: GAME_STARTED dinle — anında yönlendir
    if (environment.demo) {
      const unsub = this.gameFlow.listenForGameEvents(safePin, (payload) => {
        if (payload['type'] === 'GAME_STARTED') {
          goToGame();
        }
      });
      this.destroyRef.onDestroy(unsub);
    }

    // === 1sn Bağımsız Polling Fallback (Safari SSE yedekliliği) ===
    // GameFlowService'in kendi pollingu另haric, bileşen kendi 1sn polling'ini çalıştırır.
    // Böylece GameFlowService durdurulsa bile bu polling devam eder.
    if (environment.demo && safePin) {
      let since = Math.floor(Date.now() / 1000);
      const ntfyBase = getNtfyPublishUrl(safePin);

      const directPoll = setInterval(async () => {
        try {
          const url = `${ntfyBase}/json?poll=1&since=${since}`;
          const res = await fetch(url);
          const text = await res.text();
          let latestTime = since;

          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line) as Record<string, unknown>;
              const parsedTime = parsed['time'] as number | undefined;
              if (parsedTime && parsedTime > latestTime) {
                latestTime = parsedTime;
              }
              let payload: Record<string, unknown> | null = null;
              const msg = parsed['message'];
              if (typeof msg === 'string' && msg.startsWith('{')) {
                payload = JSON.parse(msg) as Record<string, unknown>;
              } else if (typeof msg === 'object' && msg !== null) {
                payload = msg as Record<string, unknown>;
              } else if (parsed['type']) {
                payload = parsed;
              }
              if (payload && payload['type'] === 'GAME_STARTED') {
                clearInterval(directPoll);
                goToGame();
                return;
              }
            } catch { /* parse hataları yutulur */ }
          }
          since = latestTime + 1;
        } catch { /* network hataları yutulur, tekrar denenir */ }
      }, 1000);

      this.destroyRef.onDestroy(() => clearInterval(directPoll));
    }

    // SignalR (non-demo) pathway
    this.hub.gameStarted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => goToGame());
    this.hub.questionStarted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => goToGame());
    this.hub.gameFinished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: GameFinishedEvent) => {
        if (this.sessions.loadPlayer()?.sessionId === event.sessionId) {
          goToGame();
        }
      });

    void this.hub.getConnection().catch(() => {});

    // Session state polling: durum kontrolü (fallback)
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
      relayDisconnect?.();
      this.audio.stopMusic();
    });
  }
}
