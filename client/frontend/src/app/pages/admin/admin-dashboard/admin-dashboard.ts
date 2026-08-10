import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertComponent } from '../../../shared/alert/alert';
import { AppButtonComponent } from '../../../shared/app-button/app-button';
import { LogoComponent } from '../../../shared/logo/logo';
import { ModalComponent } from '../../../shared/modal/modal';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiError, ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { SessionService } from '../../../services/session.service';
import type { CategoryDto, QuizDto } from '../../../models/types';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AlertComponent,
    AppButtonComponent,
    FormsModule,
    LogoComponent,
    ModalComponent,
    SpinnerComponent,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly sessions = inject(SessionService);
  private readonly router = inject(Router);

  readonly quizzes = signal<QuizDto[] | null>(null);
  readonly categories = signal<CategoryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');

  readonly teamMode = signal(false);
  readonly busyQuizId = signal<string | null>(null);

  readonly deleteTarget = signal<QuizDto | null>(null);
  readonly deleting = signal(false);

  readonly settingsOpen = signal(false);
  readonly settingsTarget = signal<QuizDto | null>(null);
  readonly settingsTitle = signal('');
  readonly settingsDescription = signal('');
  readonly settingsCategoryId = signal<number | null>(null);
  readonly settingsDefaultTime = signal(30);
  readonly settingsIsActive = signal(true);
  readonly settingsJokersEnabled = signal(true);
  readonly settingsLevel = signal(1);
  readonly settingsPassScore = signal(70);
  readonly settingsSaving = signal(false);
  readonly settingsError = signal('');

  protected readonly settingsTimeOptions = [10, 20, 30, 60];

  protected readonly currentUser = this.auth.user;

  constructor() {
    void this.loadQuizzes();
    void this.api
      .getCategories()
      .then((data) => this.categories.set(data))
      .catch(() => this.categories.set([]));

    effect(() => {
      // Team mode checkbox'ı "takım modu" ipucu gösterir; ayrı bir yan etki yok
      this.teamMode();
    });
  }

  async loadQuizzes(): Promise<void> {
    try {
      this.quizzes.set(await this.api.getQuizzes());
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Quizler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  async handleStartGame(quiz: QuizDto): Promise<void> {
    this.error.set('');
    if (!quiz.isActive) {
      this.error.set('Pasif durumdaki quizler oyuna başlatılamaz.');
      return;
    }
    this.busyQuizId.set(quiz.id);
    try {
      const session = await this.api.createGameSession({
        quizId: quiz.id,
        isTeamMode: this.teamMode(),
      });
      this.sessions.saveHost({
        sessionId: session.id,
        quizId: quiz.id,
        pinCode: session.pinCode,
        quizTitle: quiz.title,
        isTeamMode: this.teamMode(),
      });
      await this.router.navigate(['/admin/host', session.id]);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Oyun başlatılamadı.');
    } finally {
      this.busyQuizId.set(null);
    }
  }

  async handleDeleteQuiz(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.deleteQuiz(target.id);
      this.quizzes.update((prev) => (prev ? prev.filter((q) => q.id !== target.id) : prev));
      this.deleteTarget.set(null);
      this.message.set('Quiz başarıyla silindi.');
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Quiz silinemedi.');
    } finally {
      this.deleting.set(false);
    }
  }

  handleLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  openSettings(quiz: QuizDto): void {
    this.error.set('');
    this.message.set('');
    this.settingsTarget.set(quiz);
    this.settingsTitle.set(quiz.title);
    this.settingsDescription.set(quiz.description);
    this.settingsCategoryId.set(quiz.categoryId);
    this.settingsDefaultTime.set(quiz.defaultTimeLimitInSeconds);
    this.settingsIsActive.set(quiz.isActive);
    this.settingsJokersEnabled.set(quiz.jokersEnabled);
    this.settingsLevel.set(quiz.level);
    this.settingsPassScore.set(quiz.passScore);
    this.settingsError.set('');
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    if (this.settingsSaving()) {
      return;
    }
    this.settingsOpen.set(false);
    this.settingsTarget.set(null);
  }

  onSettingsCategoryChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.settingsCategoryId.set(value > 0 ? value : null);
  }

  async saveSettings(): Promise<void> {
    const target = this.settingsTarget();
    if (!target || this.settingsSaving()) {
      return;
    }
    const title = this.settingsTitle().trim();
    if (!title) {
      this.settingsError.set('Quiz adı boş olamaz.');
      return;
    }

    this.settingsSaving.set(true);
    this.settingsError.set('');
    try {
      const updates = {
        title,
        description: this.settingsDescription(),
        isActive: this.settingsIsActive(),
        categoryId: this.settingsCategoryId(),
        level: this.settingsLevel(),
        passScore: this.settingsPassScore(),
        defaultTimeLimitInSeconds: this.settingsDefaultTime(),
        jokersEnabled: this.settingsJokersEnabled(),
      };
      await this.api.updateQuiz(target.id, updates);
      this.quizzes.update((prev) =>
        prev ? prev.map((q) => (q.id === target.id ? { ...q, ...updates } : q)) : prev,
      );
      this.settingsOpen.set(false);
      this.settingsTarget.set(null);
      this.message.set('Quiz ayarları kaydedildi.');
    } catch (err) {
      this.settingsError.set(
        err instanceof ApiError ? err.message : 'Quiz ayarları kaydedilemedi.',
      );
    } finally {
      this.settingsSaving.set(false);
    }
  }
}
