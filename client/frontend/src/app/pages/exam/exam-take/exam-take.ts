import { Component, ChangeDetectorRef, DestroyRef, inject, NgZone, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LogoComponent } from '../../../shared/logo/logo';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import { AuthService } from '../../../services/auth.service';
import type { ExamQuestionDto, ExamOptionDto, ExamStartResult, SubmitExamAnswerResult, ExamResultDto } from '../../../models/types';

@Component({
  selector: 'app-exam-take',
  imports: [MatButtonModule, LogoComponent, SpinnerComponent],
  templateUrl: './exam-take.html',
  styleUrl: './exam-take.scss',
})
export class ExamTakeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly currentQuestion = signal<ExamQuestionDto | null>(null);
  readonly selectedIndex = signal<string | null>(null);
  readonly timeLeft = signal(40);
  readonly questionIndex = signal(0);
  readonly totalQuestions = signal(0);
  readonly lastResult = signal<SubmitExamAnswerResult | null>(null);
  readonly examFinished = signal(false);
  readonly examResult = signal<ExamResultDto | null>(null);
  readonly totalScore = signal(0);

  private attemptId = '';
  private quizId = '';
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private questionStartTime = 0;

  readonly progressPercent = computed(() => {
    const total = this.totalQuestions();
    return total > 0 ? ((this.questionIndex()) / total) * 100 : 0;
  });

  readonly isLastQuestion = computed(() => this.questionIndex() >= this.totalQuestions() - 1);

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('quizId') ?? '';
    if (!this.quizId) {
      this.router.navigate(['/'], { replaceUrl: true });
      return;
    }
    this.startExam();
  }

  private async startExam(): Promise<void> {
    const user = this.auth.user();
    if (!user) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    try {
      this.loading.set(true);
      const result = await this.api.startExam({ userId: user.userId, quizId: this.quizId });
      this.attemptId = result.attemptId;
      this.totalQuestions.set(result.totalQuestions);
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.loading.set(false);
      this.startTimer();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Sınav başlatılamadı.');
      this.loading.set(false);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timeLeft.set(40);
    this.questionStartTime = Date.now();
    this.timerHandle = setInterval(() => {
      const remaining = this.timeLeft() - 1;
      this.timeLeft.set(remaining);
      if (remaining <= 0) {
        this.stopTimer();
        this.submitAnswer(null); // timeout — no answer
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  selectOption(optionId: string): void {
    if (this.lastResult()) return;
    this.selectedIndex.set(optionId);
    this.cdr.detectChanges();
  }

  async submitAnswer(optionId: string | null): Promise<void> {
    this.stopTimer();
    const q = this.currentQuestion();
    if (!q) return;

    const timeSpentMs = Math.min(Date.now() - this.questionStartTime, 40000);

    try {
      const result = await this.api.submitExamAnswer(this.attemptId, {
        questionIndex: q.index,
        selectedOptionId: optionId,
        timeSpentMs,
      });
      this.lastResult.set(result);
      this.totalScore.update(s => s + result.scoreEarned);

      if (result.isCorrect) {
        this.audio.playSfx('correct');
      } else {
        this.audio.playSfx('wrong');
      }
      this.cdr.detectChanges();

      // Auto-advance after 1.5s delay
      setTimeout(() => {
        this.ngZone.run(() => {
          this.lastResult.set(null);
          this.selectedIndex.set(null);

          if (result.nextQuestionIndex === -1) {
            // Exam finished
            this.examFinished.set(true);
            this.fetchResult();
          } else {
            this.loadNextQuestion(result.nextQuestionIndex);
          }
        });
      }, 1500);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Cevap gönderilemedi.');
    }
  }

  private async loadNextQuestion(index: number): Promise<void> {
    try {
      this.loading.set(true);
      const result = await this.api.getExamQuestion(this.attemptId, index);
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.loading.set(false);
      this.startTimer();
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Soru yüklenemedi.');
      this.loading.set(false);
    }
  }

  private async fetchResult(): Promise<void> {
    try {
      this.loading.set(true);
      const result = await this.api.getExamResult(this.attemptId);
      this.examResult.set(result);
      this.loading.set(false);
    } catch {
      this.loading.set(false);
    }
  }

  exit(): void {
    this.stopTimer();
    void this.router.navigate(['/'], { replaceUrl: true });
  }
}
