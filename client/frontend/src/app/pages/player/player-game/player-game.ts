import { Component, ChangeDetectorRef, DestroyRef, computed, effect, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { AnswerButtonComponent } from '../../../shared/answer-button/answer-button';
import { CountdownBarComponent } from '../../../shared/countdown-bar/countdown-bar';
import { LogoComponent } from '../../../shared/logo/logo';
import { ScoreTableComponent } from '../../../shared/score-table/score-table';
import { SoundToggleComponent } from '../../../shared/sound-toggle/sound-toggle';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { GameHubService } from '../../../services/game-hub.service';
import { RelayService, type RelayGameState } from '../../../services/relay.service';
import { SessionService, type PlayerSession } from '../../../services/session.service';
import { QuizService } from '../../../services/quiz.service';
import { GameFlowService } from '../../../services/game-flow.service';
import { getNtfyPublishUrl } from '../../../shared/ntfy-channel.util';
import { environment } from '../../../../environments/environment';
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

@Component({
  selector: 'app-player-game',
  imports: [
    AnswerButtonComponent,
    CountdownBarComponent,
    LogoComponent,
    MatButtonModule,
    ScoreTableComponent,
    SoundToggleComponent,
    SpinnerComponent,
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
  private readonly relay = inject(RelayService);
  private readonly quiz = inject(QuizService);
  private readonly gameFlow = inject(GameFlowService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly session = signal<PlayerSession | null>(null);
  readonly phase = signal<Phase>('connecting');
  readonly statusGate = signal<RelayGameState['status'] | null>(null);
  readonly question = signal<CurrentQuestionDto | null>(null);
  readonly result = signal<SubmitAnswerResult | null>(null);
  readonly selectedOptionId = signal<string | null>(null);
  readonly duration = signal(30);
  readonly questionStartedAt = signal(0);
  readonly scoreboard = signal<ScoreboardDto | null>(null);
  readonly timedOut = signal(false);

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
      .catch(() => {
        // Bağlantı başarısız olursa kullanıcıya gösterilmez; arka planda yeniden bağlanılır.
      });

    const pollTimer = setInterval(() => {
      const p = this.phase();
      if (p === 'question' || p === 'finished') {
        return;
      }
      void this.restoreFromServer(currentSession);
    }, 1500);
    this.destroyRef.onDestroy(() => clearInterval(pollTimer));

    let relayFetching = false;
    const relayPollTimer = setInterval(() => {
      if (relayFetching) {
        return;
      }
      relayFetching = true;
      void this.relay
        .fetchLatestGameState(currentSession.pinCode)
        .then((state) => this.applyRelayGameState(state, currentSession))
        .finally(() => {
          relayFetching = false;
        });
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(relayPollTimer));

    const relayDisconnect = this.relay.connect(currentSession.pinCode, false, (msg) => {
      if (msg.type === 'game') {
        this.applyRelayGameState(msg, currentSession);
      }
    });
    this.destroyRef.onDestroy(() => relayDisconnect());

    this.hub.questionStarted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: QuestionStartedEvent) => {
        if (event.sessionId === currentSession.sessionId) {
          void this.startQuestion(event, currentSession);
        }
      });

    this.hub.gameStateChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: QuestionStartedEvent) => {
        if (event.sessionId !== currentSession.sessionId) {
          return;
        }
        const state = this.eventToQuestion(event);
        if (state) {
          this.syncFromServer(state, currentSession);
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

    // ── ntfy SHOW_QUESTION: initial fetch + 1sn polling + SSE (GameFlowService) ──
    if (environment.demo) {
      const safePin = String(currentSession.pinCode ?? '').trim();
      const ntfyBase = getNtfyPublishUrl(safePin);

      const handleShowQuestion = (payload: Record<string, unknown>): void => {
        if (payload['type'] !== 'SHOW_QUESTION') {
          return;
        }
        const q = payload['question'] as Record<string, unknown> | undefined;
        if (!q) {
          return;
        }
        const question: CurrentQuestionDto = {
          answered: false,
          finished: false,
          questionId: (q['id'] as string) ?? null,
          text: (q['text'] as string) ?? '',
          orderNo: (q['orderNo'] as number) ?? 0,
          totalQuestions: (q['totalQuestions'] as number) ?? 1,
          timeLimitInSeconds: (q['duration'] as number) ?? 30,
          points: (q['points'] as number) ?? 0,
          options: Array.isArray(q['options'])
            ? (q['options'] as Array<{ optionId: string; text: string }>)
            : [],
          correctOptionId: (q['correctOptionId'] as string) ?? null,
        };
        this.ngZone.run(() => {
          this.applyNewQuestion(question);
          this.cdr.detectChanges();
        });
      };

      // İlk salisede son mesajı çek — geç gelen oyuncu soruyu anında görür
      fetch(`${ntfyBase}/json?poll=1&since=all`)
        .then((r) => r.text())
        .then((text) => {
          const lines = text.split('\n').filter((l) => l.trim());
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const parsed = JSON.parse(lines[i]) as Record<string, unknown>;
              const msg = parsed['message'];
              let payload: Record<string, unknown> | null = null;
              if (typeof msg === 'string' && msg.startsWith('{')) {
                payload = JSON.parse(msg) as Record<string, unknown>;
              } else if (typeof msg === 'object' && msg !== null) {
                payload = msg as Record<string, unknown>;
              } else if (parsed['type']) {
                payload = parsed;
              }
              if (payload && payload['type'] === 'SHOW_QUESTION') {
                handleShowQuestion(payload);
                return;
              }
            } catch { /* parse hatası */ }
          }
        })
        .catch(() => {});

      // GameFlowService SSE + polling (SHOW_QUESTION dahil)
      const unsub = this.gameFlow.listenForGameEvents(safePin, handleShowQuestion);
      this.destroyRef.onDestroy(unsub);

      // 1sn bağımsız yedek polling (Safari uyumluluğu)
      let since = Math.floor(Date.now() / 1000);
      const directPoll = setInterval(async () => {
        try {
          const res = await fetch(`${ntfyBase}/json?poll=1&since=${since}`);
          const text = await res.text();
          let latestTime = since;
          for (const line of text.split('\n').filter((l) => l.trim())) {
            try {
              const parsed = JSON.parse(line) as Record<string, unknown>;
              const t = parsed['time'] as number | undefined;
              if (t && t > latestTime) {
                latestTime = t;
              }
              const msg = parsed['message'];
              let payload: Record<string, unknown> | null = null;
              if (typeof msg === 'string' && msg.startsWith('{')) {
                payload = JSON.parse(msg) as Record<string, unknown>;
              } else if (typeof msg === 'object' && msg !== null) {
                payload = msg as Record<string, unknown>;
              } else if (parsed['type']) {
                payload = parsed;
              }
              if (payload && payload['type'] === 'SHOW_QUESTION') {
                handleShowQuestion(payload);
              }
            } catch { /* parse hatası */ }
          }
          since = latestTime + 1;
        } catch { /* network hatası */ }
      }, 1000);
      this.destroyRef.onDestroy(() => clearInterval(directPoll));
    }

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
    if (p === 'question' || p === 'finished') {
      return;
    }
    try {
      const current = await this.api.getQuestion(currentSession.sessionId, currentSession.playerId);
      this.syncFromServer(current, currentSession);
      this.cdr.detectChanges();
    } catch {
      if (this.phase() === 'connecting') {
        this.phase.set('waiting');
      }
    }
  }

  private eventToQuestion(event: QuestionStartedEvent): CurrentQuestionDto | null {
    if (!event.questionId || !event.text || !event.options) {
      return null;
    }
    return {
      answered: false,
      finished: false,
      questionId: event.questionId,
      text: event.text,
      orderNo: event.orderNo,
      totalQuestions: event.totalQuestions,
      timeLimitInSeconds: event.timeLimitInSeconds,
      points: event.points,
      options: event.options,
    };
  }

  private applyNewQuestion(question: CurrentQuestionDto): void {
    this.answered = question.answered;
    this.result.set(null);
    this.selectedOptionId.set(null);
    this.timedOut.set(false);
    this.question.set(question);
    this.duration.set(question.timeLimitInSeconds);
    this.questionStartedAt.set(Date.now());
    this.phase.set(question.answered ? 'answered' : 'question');
  }

  private syncFromServer(current: CurrentQuestionDto, currentSession: PlayerSession): void {
    const p = this.phase();
    if (current.finished) {
      if (p !== 'finished') {
        this.phase.set('finished');
        void this.loadScoreboard(currentSession.sessionId);
      }
      return;
    }
    if (!current.questionId) {
      return;
    }
    const sameQuestion = this.question()?.questionId === current.questionId;

    if (current.answered) {
      if (p !== 'answered') {
        this.answered = true;
        this.question.set(current);
        this.duration.set(current.timeLimitInSeconds);
        this.result.set({
          answerId: '',
          isCorrect: current.isCorrect ?? false,
          scoreEarned: current.scoreEarned ?? 0,
          correctOptionId: current.correctOptionId ?? '',
          responseTimeInSeconds: 0,
        });
        this.phase.set('answered');
        void this.loadScoreboard(currentSession.sessionId);
      }
    } else if (p === 'question' && sameQuestion) {
      // Aynı soru zaten açıkken heartbeat/veri gelirse sadece süreyi tazele.
      this.duration.set(current.timeLimitInSeconds);
    } else if (!sameQuestion || p === 'connecting' || p === 'waiting') {
      this.applyNewQuestion(current);
    }
  }

  /**
   * Host'un ntfy kanalına sürekli yayınladığı oyun durumu snapshot'ını
   * (WAITING / QUESTION / LEADERBOARD / FINISHED) uygular. Hem canlı
   * websocket hem HTTP polling (json?poll=1) buraya gelir; websocket kaçsa
   * bile telefon güncel duruma garantili geçer.
   */
  private applyRelayGameState(
    state: RelayGameState | null,
    currentSession: PlayerSession,
  ): void {
    if (!state || state.sessionId !== currentSession.sessionId) {
      return;
    }
    this.statusGate.set(state.status);
    const p = this.phase();

    if (state.status === 'FINISHED') {
      if (p !== 'finished') {
        this.phase.set('finished');
        void this.loadScoreboard(currentSession.sessionId);
      }
      this.cdr.detectChanges();
      return;
    }

    if (state.status === 'QUESTION') {
      this.forceQuestion(state.question ?? null);
      this.cdr.detectChanges();
      return;
    }

    if (state.status === 'LEADERBOARD') {
      if (p === 'question' || p === 'connecting' || p === 'waiting') {
        this.answered = true;
        this.phase.set('answered');
        void this.loadScoreboard(currentSession.sessionId);
        this.cdr.detectChanges();
      }
      return;
    }

    if (state.status === 'WAITING') {
      if (p === 'connecting' || (p === 'question' && !this.question())) {
        this.phase.set('waiting');
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * QUESTION snapshot'ından gelen soruyu ekrana ZORLA uygular.
   * Eksik/null veri gelse bile rendering'i durdurmaz; aynı soru zaten
   * açıksa (question/answered fazında) mevcut ekran korunur, yeni soru
   * geldiyse anında A/B/C/D şıklarıyla soru ekranına geçilir.
   */
  private forceQuestion(
    data: RelayGameState['question'] | null,
  ): void {
    if (!data) {
      return;
    }
    const current = this.question();
    const sameQuestion =
      !!current?.questionId && current.questionId === data.id;

    if (sameQuestion) {
      if (this.phase() === 'question') {
        this.duration.set(data.duration);
      }
      return;
    }

    const question: CurrentQuestionDto = {
      answered: false,
      finished: false,
      questionId: data.id,
      text: data.text ?? '',
      orderNo: data.orderNo ?? current?.orderNo ?? 0,
      totalQuestions: data.totalQuestions ?? current?.totalQuestions ?? 1,
      timeLimitInSeconds: data.duration ?? current?.timeLimitInSeconds ?? 30,
      points: data.points ?? current?.points ?? 0,
      options: Array.isArray(data.options) ? data.options : [],
      correctOptionId: data.correctOptionId ?? null,
    };
    this.applyNewQuestion(question);
  }

  private async startQuestion(
    event: QuestionStartedEvent,
    currentSession: PlayerSession,
  ): Promise<void> {
    const optimistic = this.eventToQuestion(event);
    if (optimistic) {
      this.applyNewQuestion(optimistic);
    }

    try {
      const fetched = await this.api.getQuestion(currentSession.sessionId, currentSession.playerId);
      this.syncFromServer(fetched, currentSession);
    } catch {
      // Soru verisi alınamazsa sessizce geç; event/heartbeat verisiyle ekran zaten güncellendi.
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

    const q = this.question();
    const correctOptionId = q?.correctOptionId ?? '';

    let answer: SubmitAnswerResult;

    try {
      answer = await this.api.submitAnswer(session.sessionId, {
        playerId: session.playerId,
        questionId: q?.questionId ?? '',
        selectedOptionId: optionId,
        responseTimeInSeconds: responseTime,
      });
    } catch {
      answer = this.quiz.buildLocalResult(optionId, correctOptionId, q, responseTime);
      const totalScore = this.myScore() + answer.scoreEarned;
      void this.relay.publish(session.pinCode, {
        type: 'answer',
        sessionId: session.sessionId,
        playerId: session.playerId,
        playerName: session.playerName,
        isCorrect: answer.isCorrect,
        scoreEarned: answer.scoreEarned,
        newTotalScore: totalScore,
      });
    }

    this.result.set(answer);
    this.audio.playSfx(answer.isCorrect ? 'correct' : 'wrong');
    this.phase.set('answered');
    await this.loadScoreboard(session.sessionId);
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
