import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertComponent } from '../../../shared/alert/alert';
import { AnswerButtonComponent } from '../../../shared/answer-button/answer-button';
import { AppButtonComponent } from '../../../shared/app-button/app-button';
import { CountdownBarComponent } from '../../../shared/countdown-bar/countdown-bar';
import { LogoComponent } from '../../../shared/logo/logo';
import { ScoreTableComponent } from '../../../shared/score-table/score-table';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { ApiError, ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { SessionService, type PlayerSession } from '../../../services/session.service';
import { sortOptionsById } from '../../../data/options';
import type {
  AnswerSubmittedEvent,
  CurrentQuestionDto,
  GameFinishedEvent,
  QuestionStartedEvent,
  ScoreboardDto,
  SubmitAnswerResult,
} from '../../../models/types';

type Phase = 'connecting' | 'waiting' | 'question' | 'answered' | 'finished';

const EXTRA_TIME_SECONDS = 15;

@Component({
  selector: 'app-player-game',
  imports: [
    AlertComponent,
    AnswerButtonComponent,
    AppButtonComponent,
    CountdownBarComponent,
    LogoComponent,
    ScoreTableComponent,
    SoundToggleComponent,
  ],
  templateUrl: './player-game.html',
  styleUrl: './player-game.scss',
})
export class PlayerGameComponent {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly hub = inject(GameHubService);
  private readonly sessions = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = signal<PlayerSession | null>(null);
  readonly phase = signal<Phase>('connecting');
  readonly question = signal<CurrentQuestionDto | null>(null);
  readonly result = signal<SubmitAnswerResult | null>(null);
  readonly selectedOptionId = signal<string | null>(null);
  readonly usedJokers = signal<string[]>([]);
  readonly duration = signal(30);
  readonly questionStartedAt = signal(0);
  readonly scoreboard = signal<ScoreboardDto | null>(null);
  readonly timedOut = signal(false);
  readonly error = signal('');

  private answered = false;

  protected readonly myRank = computed(() => {
    const board = this.scoreboard();
    const session = this.session();
    if (!board || !session) {
      return -1;
    }
    return board.individual.findIndex((p) => p.playerId === session.playerId);
  });

  protected readonly myScore = computed(() => {
    const board = this.scoreboard();
    const session = this.session();
    if (!board || !session) {
      return 0;
    }
    return board.individual.find((p) => p.playerId === session.playerId)?.score ?? 0;
  });

  protected readonly questionOptions = computed(() =>
    this.question() ? sortOptionsById(this.question()!.options) : [],
  );

  protected readonly revealCorrectId = computed(
    () => this.result()?.correctOptionId || this.question()?.correctOptionId || '',
  );

  constructor() {
    const stored = this.sessions.loadPlayer();
    if (!stored) {
      void this.router.navigate(['/player'], { replaceUrl: true });
      return;
    }
    const currentSession = stored;
    this.session.set(currentSession);

    effect(() => {
      const p = this.phase();
      if (p === 'question') {
        this.audio.playMusic('countdown');
      } else if (p === 'answered') {
        this.audio.stopMusic();
      } else if (p === 'finished') {
        this.audio.playMusic('victory');
      } else {
        this.audio.playMusic('lobby');
      }
    });
    this.destroyRef.onDestroy(() => this.audio.stopMusic());

    void this.hub
      .getConnection()
      .then(() => this.hub.joinGameGroup(currentSession.sessionId))
      .catch(() => this.error.set('Canlı sunucuya bağlanılamadı.'));

    this.hub.questionStarted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: QuestionStartedEvent) => {
        if (event.sessionId === currentSession.sessionId) {
          void this.startQuestion(event, currentSession);
        }
      });

    this.hub.gameStarted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.restoreFromServer(currentSession);
    });

    this.hub.answerSubmitted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: AnswerSubmittedEvent) => {
        if (event.sessionId === currentSession.sessionId) {
          void this.loadScoreboard(currentSession.sessionId);
        }
      });

    this.hub.gameFinished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: GameFinishedEvent) => {
        if (event.sessionId === currentSession.sessionId) {
          this.phase.set('finished');
          void this.loadScoreboard(currentSession.sessionId);
        }
      });

    void this.restoreFromServer(currentSession);
  }

  private async loadScoreboard(sessionId: string): Promise<void> {
    try {
      this.scoreboard.set(await this.api.getScoreboard(sessionId));
    } catch {
      // skor tablosu alınamazsa sessizce geç
    }
  }

  private async restoreFromServer(currentSession: PlayerSession): Promise<void> {
    const p = this.phase();
    if (p === 'question' || p === 'answered' || p === 'finished') {
      return;
    }
    try {
      const current = await this.api.getQuestion(currentSession.sessionId, currentSession.playerId);
      if (current.finished) {
        this.phase.set('finished');
        await this.loadScoreboard(currentSession.sessionId);
        return;
      }
      this.usedJokers.set(current.usedJokers ?? []);
      if (current.questionId) {
        this.answered = current.answered;
        this.question.set(current);
        this.duration.set(current.timeLimitInSeconds);
        this.questionStartedAt.set(Date.now());
        if (current.answered) {
          this.result.set({
            answerId: '',
            isCorrect: current.isCorrect ?? false,
            scoreEarned: current.scoreEarned ?? 0,
            correctOptionId: current.correctOptionId ?? '',
            responseTimeInSeconds: 0,
            usedJokers: [],
          });
          this.phase.set('answered');
        } else {
          this.phase.set('question');
        }
        await this.loadScoreboard(currentSession.sessionId);
      }
    } catch {
      if (this.phase() === 'connecting') {
        this.phase.set('waiting');
      }
    }
  }

  private async startQuestion(
    event: QuestionStartedEvent,
    currentSession: PlayerSession,
  ): Promise<void> {
    this.answered = false;
    this.result.set(null);
    this.selectedOptionId.set(null);
    this.timedOut.set(false);
    this.duration.set(event.timeLimitInSeconds);
    this.questionStartedAt.set(Date.now());

    try {
      const fetched = await this.api.getQuestion(currentSession.sessionId, currentSession.playerId);
      if (fetched.finished) {
        this.phase.set('finished');
        await this.loadScoreboard(currentSession.sessionId);
        return;
      }
      this.question.set(fetched);
      this.usedJokers.set(fetched.usedJokers ?? []);
      if (fetched.answered) {
        this.answered = true;
        this.phase.set('answered');
        this.result.set({
          answerId: '',
          isCorrect: fetched.isCorrect ?? false,
          scoreEarned: fetched.scoreEarned ?? 0,
          correctOptionId: fetched.correctOptionId ?? '',
          responseTimeInSeconds: 0,
          usedJokers: [],
        });
      } else {
        this.phase.set('question');
      }
      await this.loadScoreboard(currentSession.sessionId);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Soru alınamadı.');
    }
  }

  async handleAnswer(optionId: string): Promise<void> {
    const session = this.session();
    if (!session || this.phase() !== 'question' || this.answered) {
      return;
    }
    this.answered = true;
    this.selectedOptionId.set(optionId);

    const responseTime = Math.min(
      Math.round((Date.now() - this.questionStartedAt()) / 1000),
      this.duration(),
    );

    try {
      const answer = await this.api.submitAnswer(session.sessionId, {
        playerId: session.playerId,
        questionId: this.question()?.questionId ?? '',
        selectedOptionId: optionId,
        responseTimeInSeconds: responseTime,
      });
      this.result.set(answer);
      this.audio.playSfx(answer.isCorrect ? 'correct' : 'wrong');
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Cevap gönderilemedi.');
    } finally {
      this.phase.set('answered');
      await this.loadScoreboard(session.sessionId);
    }
  }

  async handleJoker(jokerType: string): Promise<void> {
    const session = this.session();
    if (!session || !this.question() || this.phase() !== 'question' || this.answered) {
      return;
    }
    if (this.usedJokers().includes(jokerType)) {
      return;
    }

    try {
      await this.api.useJoker(
        session.sessionId,
        session.playerId,
        this.question()!.questionId ?? '',
        jokerType,
      );
      this.usedJokers.update((prev) => [...prev, jokerType]);

      if (jokerType === 'ExtraTime') {
        this.duration.update((prev) => prev + EXTRA_TIME_SECONDS);
      }

      if (jokerType === 'FiftyFifty') {
        const refreshed = await this.api.getQuestion(session.sessionId, session.playerId);
        this.question.set(refreshed);
      }
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Joker kullanılamadı.');
    }
  }

  handleTimeout(): void {
    if (this.phase() !== 'question' || this.answered) {
      return;
    }
    this.answered = true;
    this.timedOut.set(true);
    this.phase.set('answered');
  }

  exit(): void {
    this.sessions.clearPlayer();
    void this.router.navigate(['/'], { replaceUrl: true });
  }
}
