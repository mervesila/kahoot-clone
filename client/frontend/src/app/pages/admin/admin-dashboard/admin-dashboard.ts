import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { ModalComponent } from '../../../shared/modal/modal';
import { SpinnerComponent } from '../../../shared/spinner/spinner';
import { ApiError, ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import {
  QuizSettingsDialogComponent,
  type QuizSettingsData,
} from './quiz-settings-dialog';
import {
  QuizCreateDialogComponent,
  type QuizCreateResult,
} from './quiz-create-dialog';
import type { CategoryDto, QuizDto } from '../../../models/types';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AlertComponent,
    LogoComponent,
    MatButtonModule,
    MatSlideToggleModule,
    MatTableModule,
    ModalComponent,
    RouterLink,
    SpinnerComponent,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly quizzes = signal<QuizDto[] | null>(null);
  readonly categories = signal<CategoryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');

  readonly deleteTarget = signal<QuizDto | null>(null);
  readonly deleting = signal(false);

  protected readonly displayedColumns = ['name', 'level', 'status', 'questions', 'pass', 'actions'];

  protected readonly currentUser = this.auth.user;

  protected readonly quizCount = computed(() => this.quizzes()?.length ?? 0);

  protected readonly quizGroups = computed(() => {
    const list = this.quizzes() ?? [];
    return [
      { level: 1, quizzes: list.filter((q) => q.level === 1) },
      { level: 2, quizzes: list.filter((q) => q.level === 2) },
    ];
  });

  constructor() {
    void this.loadQuizzes();
    void this.loadCategories();
  }

  async loadQuizzes(): Promise<void> {
    try {
      this.quizzes.set(await this.api.getQuizzes());
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Sınavlar yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleExamStatus(quiz: QuizDto): Promise<void> {
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.toggleExamStatus(quiz.id);
      this.quizzes.update(prev =>
        prev ? prev.map(q => (q.id === quiz.id ? { ...q, isActive: result.isActive } : q)) : prev,
      );
      this.message.set(`"${quiz.title}" sınavı ${result.isActive ? 'aktif' : 'pasif'} yapıldı.`);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Durum değiştirilemedi.');
    }
  }

  async copyExamLink(quiz: QuizDto): Promise<void> {
    const url = `${window.location.origin}/sinav`;
    try {
      await navigator.clipboard.writeText(url);
      this.message.set('Link kopyalandı!');
    } catch {
      this.error.set('Link kopyalanamadı.');
    }
  }

  openSettings(quiz: QuizDto): void {
    this.error.set('');
    this.message.set('');
    const data: QuizSettingsData = {
      quiz,
      categories: this.categories(),
    };
    const ref = this.dialog.open(QuizSettingsDialogComponent, {
      data,
      width: '560px',
      maxWidth: '96vw',
    });
    ref.afterClosed().subscribe((updates) => {
      if (!updates) {
        return;
      }
      this.quizzes.update((prev) =>
        prev ? prev.map((q) => (q.id === quiz.id ? { ...q, ...updates } : q)) : prev,
      );
      void this.loadCategories();
      this.message.set('Sınav ayarları kaydedildi.');
    });
  }

  openCreateQuiz(): void {
    this.error.set('');
    this.message.set('');
    const ref = this.dialog.open(QuizCreateDialogComponent, {
      data: { categories: this.categories() },
      width: '560px',
      maxWidth: '96vw',
    });
    ref.afterClosed().subscribe((result: QuizCreateResult | null) => {
      if (!result) {
        return;
      }
      void this.loadQuizzes();
      void this.loadCategories();
      this.message.set(`“${result.title}” sınavı oluşturuldu.`);
    });
  }

  private loadCategories(): Promise<void> {
    return this.api
      .getCategories()
      .then((data) => this.categories.set(data))
      .catch(() => this.categories.set([]));
  }

  confirmDelete(quiz: QuizDto): void {
    this.error.set('');
    this.message.set('');
    this.deleteTarget.set(quiz);
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
      this.message.set('Sınav başarıyla silindi.');
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Sınav silinemedi.');
    } finally {
      this.deleting.set(false);
    }
  }

  handleLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  categoryName(categoryId: number | null): string {
    if (categoryId === null) {
      return '';
    }
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  questionLabel(quiz: QuizDto): string {
    if (quiz.isDynamic) {
      const category = this.categoryName(quiz.categoryId);
      return category ? `10 soru (${category} havuzundan)` : '10 soru (havuzdan)';
    }
    return `${quiz.questionCount} soru`;
  }

  levelLabel(level: number): string {
    return `Seviye ${level}`;
  }
}
