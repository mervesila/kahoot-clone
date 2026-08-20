import { Component, ChangeDetectorRef, DestroyRef, inject, NgZone, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LogoComponent } from '../../../shared/logo/logo';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiService } from '../../../services/api.service';
import { AudioService } from '../../../services/audio.service';
import type { ExamQuestionDto, ExamStartResult, SubmitExamAnswerResult, ExamResultDto } from '../../../models/types';

@Component({
  selector: 'app-exam-take',
  imports: [
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LogoComponent,
    SpinnerComponent,
    DecimalPipe,
  ],
  templateUrl: './exam-take.html',
  styleUrl: './exam-take.scss',
})
export class ExamTakeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly step = signal<'entry' | 'loading' | 'error' | 'exam' | 'result'>('entry');
  readonly studentName = signal('');
  readonly entryError = signal('');

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
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  async startExam(): Promise<void> {
    const name = this.studentName().trim();
    if (!name) {
      this.entryError.set('Adınızı ve soyadınızı giriniz.');
      return;
    }

    this.entryError.set('');
    this.step.set('loading');

    try {
      console.log('[EXAM] startExam isteği gönderiliyor...', { quizId: this.quizId, studentName: name });
      const result = await this.api.startExam({
        studentName: name,
        registrationNumber: '',
        quizId: this.quizId,
      });
      console.log('[EXAM] API yanıtı:', result);
      if (!result || !result.question) {
        throw new Error('Sınav verisi alınamadı. Sunucu yanıtı boş döndü.');
      }
      this.attemptId = result.attemptId;
      this.totalQuestions.set(result.totalQuestions);
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.step.set('exam');
      this.startTimer();
    } catch (err: unknown) {
      console.error('[EXAM] startExam hatası:', err);
      const msg = err instanceof Error ? err.message : 'Sınav soruları yüklenemedi, lütfen tekrar deneyin.';
      this.entryError.set(msg);
      this.step.set('entry');
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
        this.submitAnswer(null);
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

      setTimeout(() => {
        this.ngZone.run(() => {
          this.lastResult.set(null);
          this.selectedIndex.set(null);

          if (result.nextQuestionIndex === -1) {
            this.examFinished.set(true);
            this.fetchResult();
          } else {
            this.loadNextQuestion(result.nextQuestionIndex);
          }
        });
      }, 1500);
    } catch (err: unknown) {
      this.entryError.set(err instanceof Error ? err.message : 'Cevap gönderilemedi.');
      this.step.set('error');
    }
  }

  private async loadNextQuestion(index: number): Promise<void> {
    try {
      this.step.set('loading');
      console.log('[EXAM] loadNextQuestion:', { attemptId: this.attemptId, index });
      const result = await this.api.getExamQuestion(this.attemptId, index);
      console.log('[EXAM] Soru yanıtı:', result);
      if (!result || !result.question) {
        throw new Error('Soru yüklenemedi. Sunucu yanıtı boş döndü.');
      }
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.step.set('exam');
      this.startTimer();
    } catch (err: unknown) {
      console.error('[EXAM] loadNextQuestion hatası:', err);
      const msg = err instanceof Error ? err.message : 'Soru yüklenemedi, lütfen tekrar deneyin.';
      this.entryError.set(msg);
      this.step.set('error');
    }
  }

  private async fetchResult(): Promise<void> {
    try {
      this.step.set('loading');
      console.log('[EXAM] fetchResult:', { attemptId: this.attemptId });
      const result = await this.api.getExamResult(this.attemptId);
      console.log('[EXAM] Sonuç yanıtı:', result);
      if (!result) {
        throw new Error('Sonuç alınamadı. Sunucu yanıtı boş döndü.');
      }
      this.examResult.set(result);
      this.step.set('result');
    } catch (err: unknown) {
      console.error('[EXAM] fetchResult hatası:', err);
      const msg = err instanceof Error ? err.message : 'Sonuç yüklenemedi.';
      this.entryError.set(msg);
      this.step.set('error');
    }
  }

  exit(): void {
    this.stopTimer();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  retryEntry(): void {
    this.stopTimer();
    this.entryError.set('');
    this.step.set('entry');
  }
}
