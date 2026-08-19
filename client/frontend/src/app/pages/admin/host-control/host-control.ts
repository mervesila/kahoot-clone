import { Component, ChangeDetectorRef, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AlertComponent } from '../../../shared/alert/alert';
import { CountdownBarComponent } from '../../../shared/countdown-bar/countdown-bar';
import { LogoComponent } from '../../../shared/logo/logo';
import { ModalComponent } from '../../../shared/modal/modal';
import { ScoreTableComponent } from '../../../shared/score-table/score-table';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiError, ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { RelayService, type RelayGameStatus, type RelayGameState } from '../../../services/relay.service';
import { SessionService, type HostSession } from '../../../services/session.service';
import { optionClass, optionLetter, sortOptionsById } from '../../../data/options';
import { getNtfyOutPublishUrl } from '../../../shared/ntfy-channel.util';
import { environment } from '../../../../environments/environment';
import type {
  AnswerSubmittedEvent,
  GameFinishedEvent,
  QuestionStartedEvent,
  ScoreboardDto,
  SessionQuestionDto,
} from '../../../models/types';

const HOST_OPTION_CLASSES = ['host-opt-red', 'host-opt-blue', 'host-opt-yellow', 'host-opt-green'];

type SessionStatus = 'Waiting' | 'InGame' | 'Finished';

interface LiveAnswer {
  playerName: string;
  isCorrect: boolean;
  scoreEarned: number;
}

@Component({
  selector: 'app-host-control',
  imports: [
    AlertComponent,
    CountdownBarComponent,
    LogoComponent,
    MatButtonModule,
    ModalComponent,
    RouterLink,
    ScoreTableComponent,
    SoundToggleComponent,
    SpinnerComponent,
  ],
  templateUrl: './host-control.html',
  styleUrl: './host-control.scss',
})
export class HostControlComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly hub = inject(GameHubService);
  private readonly sessions = inject(SessionService);
  private readonly relay = inject(RelayService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly host = signal<HostSession | null>(null);
  readonly sessionQuestions = signal<SessionQuestionDto[]>([]);
  readonly status = signal<SessionStatus>('Waiting');
  readonly questionOrderNo = signal(0);
  readonly timeLimit = signal(30);
  readonly liveAnswers = signal<LiveAnswer[]>([]);
  readonly answerRevealed = signal(false);
  readonly scoreboard = signal<ScoreboardDto | null>(null);
  readonly showScoreboard = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  private snapshotTimer: number | null = null;

  protected readonly currentQuestion = computed(() => {
    const questions = this.sessionQuestions();
    if (questions.length === 0) {
      return null;
    }
    return questions.find((q) => q.orderNo === this.questionOrderNo()) ?? null;
  });

  protected readonly currentQuestionOptions = computed(() => {
    const question = this.currentQuestion();
    return question ? sortOptionsById(question.options) : [];
  });

  protected readonly correctOption = computed(
    () => this.currentQuestion()?.options.find((o) => o.isCorrect) ?? null,
  );

  protected readonly isLastQuestion = computed(() => {
    const questions = this.sessionQuestions();
    return questions.length > 0 && this.questionOrderNo() >= questions.length;
  });

  protected readonly statusLabel = computed(() => {
    const st = this.status();
    return st === 'Waiting' ? 'Beklemede' : st === 'InGame' ? 'Oynanıyor' : 'Bitti';
  });

  constructor() {
    const sessionId = this.route.snapshot.paramMap.get('sessionId') ?? '';
    const stored = this.sessions.loadHost();
    if (!stored || stored.sessionId !== sessionId) {
      void this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
      return;
    }
    this.host.set(stored);

    this.snapshotTimer = window.setInterval(() => this.broadcastSnapshot(), 1000);
    this.destroyRef.onDestroy(() => {
      if (this.snapshotTimer !== null) {
        clearInterval(this.snapshotTimer);
        this.snapshotTimer = null;
      }
    });

    void this.api
      .getSessionQuestions(stored.sessionId)
      .then((questions) => this.sessionQuestions.set(questions))
      .catch((err) =>
        this.error.set(
          err instanceof ApiError ? err.message : 'Oturum soruları yüklenemedi.',
        ),
      );
    void this.api
      .getSessionState(stored.sessionId)
      .then((state) => {
        this.status.set(state.status);
        this.questionOrderNo.set(state.currentQuestionOrderNo);
      })
      .catch(() => undefined);
    void this.loadScoreboard(stored.sessionId);

    effect(() => {
      const st = this.status();
      const orderNo = this.questionOrderNo();
      if (st === 'InGame') {
        this.audio.playMusic('countdown');
      } else if (st === 'Finished') {
        this.audio.playMusic('victory');
      } else {
        this.audio.playMusic('lobby');
      }
      void orderNo;
    });
    this.destroyRef.onDestroy(() => this.audio.stopMusic());

    effect(() => {
      const st = this.status();
      const questions = this.sessionQuestions();
      if (st === 'InGame' && questions.length > 0) {
        const question = questions.find((q) => q.orderNo === this.questionOrderNo());
        if (question) {
          this.timeLimit.set(question.timeLimitInSeconds);
        }
      }
    });

    this.hub.questionStarted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: QuestionStartedEvent) => {
        if (event.sessionId !== sessionId) {
          return;
        }
        this.status.set('InGame');
        this.activateQuestion(event.orderNo);
        this.timeLimit.set(event.timeLimitInSeconds);
      });

    this.hub.answerSubmitted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: AnswerSubmittedEvent) => {
        if (event.sessionId !== sessionId) {
          return;
        }
        this.liveAnswers.update((prev) => [
          ...prev,
          {
            playerName: event.playerName,
            isCorrect: event.isCorrect,
            scoreEarned: event.scoreEarned,
          },
        ]);
        this.cdr.detectChanges();
        void this.loadScoreboard(sessionId);
      });

    this.hub.gameFinished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: GameFinishedEvent) => {
        if (event.sessionId === sessionId) {
          this.status.set('Finished');
          this.broadcastSnapshot();
          void this.loadScoreboard(sessionId);
        }
      });

    if (!environment.demo) {
      void this.hub
        .getConnection()
        .then(() => this.hub.joinGameGroup(sessionId))
        .catch(() => this.error.set('Canlı sunucuya bağlanılamadı.'));
    }
  }

  private async loadScoreboard(sessionId: string): Promise<void> {
    try {
      this.scoreboard.set(await this.api.getScoreboard(sessionId));
    } catch {
      // yoksay
    }
  }

  async handleAdvance(): Promise<void> {
    const host = this.host();
    if (!host) {
      return;
    }
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    try {
      if (this.status() === 'Waiting') {
        const state = await this.api.startSession(host.sessionId);
        this.status.set('InGame');
        this.activateQuestion(state.currentQuestionOrderNo);
        this.message.set('Oyun başladı!');
      } else if (this.isLastQuestion()) {
        await this.handleFinish();
      } else {
        const state = await this.api.nextQuestion(host.sessionId);
        this.status.set(state.status);
        if (state.currentQuestionOrderNo > this.questionOrderNo()) {
          this.activateQuestion(state.currentQuestionOrderNo);
        } else {
          const next = this.sessionQuestions()
            .filter((q) => q.orderNo > this.questionOrderNo())
            .sort((a, b) => a.orderNo - b.orderNo)[0];
          if (next) {
            this.activateQuestion(next.orderNo);
          }
        }
      }
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'İşlem başarısız.');
    } finally {
      this.busy.set(false);
    }
  }

  private activateQuestion(orderNo: number): void {
    this.answerRevealed.set(false);
    this.questionOrderNo.set(orderNo);
    this.liveAnswers.set([]);
    const question = this.sessionQuestions().find((q) => q.orderNo === orderNo);
    if (question) {
      this.timeLimit.set(question.timeLimitInSeconds);
    }
    this.broadcastSnapshot();
    this.publishShowQuestion();
  }

  /**
   * Soru ekrana geldiğinde veya İleri'ye basıldığında ntfy -out kanalına
   * QUESTION state POST eder; telefon soruyu anında yakalar.
   */
  private publishShowQuestion(): void {
    const host = this.host();
    const q = this.currentQuestion();
    if (!host || !q) {
      return;
    }
    const questionIndex = Math.max(0, this.questionOrderNo() - 1);
    const payload = {
      state: 'QUESTION',
      questionIndex,
      question: {
        id: q.questionId,
        text: q.text,
        options: sortOptionsById(q.options).map((o) => ({
          optionId: o.optionId,
          text: o.text,
        })),
        duration: q.timeLimitInSeconds,
        orderNo: q.orderNo,
        totalQuestions: this.sessionQuestions().length,
        points: q.points,
        correctOptionId: q.options.find((o) => o.isCorrect)?.optionId ?? null,
      },
    };
    void fetch(getNtfyOutPublishUrl(host.pinCode), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  /**
   * Oyun durumunun tam özetini (Snapshot) ntfy röle kanalına yayınlar.
   * Hem her durum değişiminde anında hem de 1 sn'de bir sürekli olarak
   * çalışır; telefon websocket'i kaçırsa bile HTTP polling ile bu
   * snapshot'ı garantili alır.
   */
  private buildSnapshot(): { type: 'game' } & RelayGameState {
    const host = this.host();
    const st = this.status();
    let status: RelayGameStatus = 'WAITING';
    if (st === 'Finished') {
      status = 'FINISHED';
    } else if (st === 'InGame') {
      const question = this.currentQuestion();
      if (!question) {
        status = 'WAITING';
      } else if (this.answerRevealed()) {
        status = 'LEADERBOARD';
      } else {
        status = 'QUESTION';
      }
    }
    const question = this.currentQuestion();
    return {
      type: 'game',
      sessionId: host?.sessionId ?? '',
      pin: host?.pinCode ?? '',
      status,
      currentQuestionIndex: Math.max(0, this.questionOrderNo() - 1),
      questionId: question?.questionId,
      question: question
        ? {
            id: question.questionId,
            text: question.text,
            options: sortOptionsById(question.options).map((o) => ({
              optionId: o.optionId,
              text: o.text,
            })),
            duration: question.timeLimitInSeconds,
            orderNo: question.orderNo,
            totalQuestions: this.sessionQuestions().length,
            points: question.points,
            correctOptionId: question.options.find((o) => o.isCorrect)?.optionId ?? null,
          }
        : undefined,
      serverTime: Date.now(),
    };
  }

  private broadcastSnapshot(): void {
    const host = this.host();
    if (!host) {
      return;
    }
    if (this.status() === 'Waiting') {
      return;
    }
    void this.relay.publish(host.pinCode, this.buildSnapshot());
  }

  async handleFinish(): Promise<void> {
    const host = this.host();
    if (!host) {
      return;
    }
    this.error.set('');
    this.busy.set(true);
    try {
      await this.api.finishSession(host.sessionId);
      this.status.set('Finished');
      this.broadcastSnapshot();
      await this.loadScoreboard(host.sessionId);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Oyun bitirilemedi.');
    } finally {
      this.busy.set(false);
    }
  }

  async handleScoreboard(): Promise<void> {
    const host = this.host();
    if (!host) {
      return;
    }
    if (!this.showScoreboard()) {
      await this.loadScoreboard(host.sessionId);
    }
    this.showScoreboard.update((prev) => !prev);
  }

  onCountdownExpired(): void {
    this.answerRevealed.set(true);
    this.audio.stopMusic();
    this.broadcastSnapshot();
  }

  letterFor(index: number): string {
    return optionLetter(index);
  }

  optionColor(index: number): string {
    return optionClass(index);
  }

  hostOptionClass(index: number): string {
    return HOST_OPTION_CLASSES[((index % 4) + 4) % 4];
  }

  download(format: 'pdf' | 'excel'): void {
    const host = this.host();
    if (!host) {
      return;
    }
    void this.api
      .downloadReport(host.sessionId, format)
      .catch((err) =>
        this.error.set(err instanceof ApiError ? err.message : 'Rapor indirilemedi.'),
      );
  }
}
