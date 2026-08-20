import { Component, ChangeDetectorRef, DestroyRef, inject, NgZone, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LogoComponent } from '../../shared/logo/logo';
import { SpinnerComponent } from '../../shared/spinner/spinner';
import { ApiService, ApiError } from '../../services/api.service';
import { AudioService } from '../../services/audio.service';
import type { ExamQuestionDto, ExamStartResult, SubmitExamAnswerResult, ExamResultDto } from '../../models/types';

@Component({
  selector: 'app-sinav-portal',
  imports: [
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LogoComponent,
    SpinnerComponent,
    DecimalPipe,
  ],
  templateUrl: './sinav-portal.html',
  styleUrl: './sinav-portal.scss',
})
export class SinavPortalComponent implements OnInit {
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
  readonly examResult = signal<ExamResultDto | null>(null);
  readonly totalScore = signal(0);
  readonly examLevel = signal(0);

  private attemptId = '';
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private questionStartTime = 0;

  readonly progressPercent = computed(() => {
    const total = this.totalQuestions();
    return total > 0 ? ((this.questionIndex()) / total) * 100 : 0;
  });

  readonly isLastQuestion = computed(() => this.questionIndex() >= this.totalQuestions() - 1);

  ngOnInit(): void {
    sessionStorage.removeItem('sinav_student');
    sessionStorage.removeItem('sinav_attempt');
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
      const result = await this.api.startByLevel({
        studentName: name,
        registrationNumber: '',
      });
      if (!result || !result.question) {
        throw new Error('Sınav verisi alınamadı.');
      }
      this.attemptId = result.attemptId;
      this.totalQuestions.set(result.totalQuestions);
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.examLevel.set(result.level);
      this.step.set('exam');
      this.startTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Katılabileceğiniz aktif bir sınav bulunmamaktadır.';
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
            this.fetchResult();
          } else {
            this.loadNextQuestion(result.nextQuestionIndex);
          }
        });
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cevap gönderilemedi.';
      if (err instanceof ApiError && err.code === 'EXAM_DEACTIVATED') {
        this.stopTimer();
        this.entryError.set(msg);
        this.step.set('error');
      } else {
        this.entryError.set(msg);
        this.step.set('error');
      }
    }
  }

  private async loadNextQuestion(index: number): Promise<void> {
    try {
      this.step.set('loading');
      const result = await this.api.getExamQuestion(this.attemptId, index);
      if (!result || !result.question) {
        throw new Error('Soru yüklenemedi.');
      }
      this.currentQuestion.set(result.question);
      this.questionIndex.set(result.question.index);
      this.step.set('exam');
      this.startTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Soru yüklenemedi.';
      if (err instanceof ApiError && err.code === 'EXAM_DEACTIVATED') {
        this.stopTimer();
      }
      this.entryError.set(msg);
      this.step.set('error');
    }
  }

  private async fetchResult(): Promise<void> {
    try {
      this.step.set('loading');
      const result = await this.api.getExamResult(this.attemptId);
      if (!result) {
        throw new Error('Sonuç alınamadı.');
      }
      this.examResult.set(result);
      this.step.set('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sonuç yüklenemedi.';
      this.entryError.set(msg);
      this.step.set('error');
    }
  }

  retryEntry(): void {
    this.stopTimer();
    this.entryError.set('');
    this.step.set('entry');
  }

  closeScreen(): void {
    this.stopTimer();
    window.close();
    this.entryError.set('Ekranı kapatmak için tarayıcı sekmesini manuel olarak kapatabilirsiniz.');
    this.step.set('result');
  }
}
