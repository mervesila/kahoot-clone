import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../../../shared/alert/alert';
import { AppButtonComponent } from '../../../shared/app-button/app-button';
import { AppInputComponent } from '../../../shared/app-input/app-input';
import { ModalComponent } from '../../../shared/modal/modal';
import { ApiError, ApiService } from '../../../services/api.service';
import { OPTION_LETTERS, optionClass } from '../../../data/options';
import type { CategoryDto, QuizDetailDto } from '../../../models/types';

const TIME_OPTIONS = [10, 20, 30, 60];

interface BuilderOption {
  text: string;
  isCorrect: boolean;
}

interface BuilderQuestion {
  id: string;
  text: string;
  timeLimitInSeconds: number;
  categoryId: number;
  options: BuilderOption[];
  isExisting?: boolean;
  dirty?: boolean;
}

function emptyOptions(): BuilderOption[] {
  return OPTION_LETTERS.map((_, i) => ({ text: '', isCorrect: i === 0 }));
}

@Component({
  selector: 'app-quiz-builder',
  imports: [AlertComponent, AppButtonComponent, AppInputComponent, FormsModule, ModalComponent],
  templateUrl: './quiz-builder.html',
  styleUrl: './quiz-builder.scss',
})
export class QuizBuilderComponent {
  readonly open = input(false);
  readonly mode = input<'create' | 'edit'>('create');
  readonly quiz = input<QuizDetailDto | null>(null);
  readonly categories = input<CategoryDto[]>([]);
  readonly close = output<void>();
  readonly saved = output<string>();

  private readonly api = inject(ApiService);

  readonly step = signal(1);
  readonly title = signal('');
  readonly description = signal('');
  readonly categoryId = signal(0);
  readonly level = signal(1);
  readonly passScore = signal(70);
  readonly questions = signal<BuilderQuestion[]>([]);
  readonly questionText = signal('');
  readonly timeLimit = signal(30);
  readonly options = signal<BuilderOption[]>(emptyOptions());
  readonly titleError = signal('');
  readonly error = signal('');
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly deleteTarget = signal<BuilderQuestion | null>(null);
  readonly deletedExistingIds = signal<string[]>([]);

  protected readonly timeOptions = TIME_OPTIONS;
  protected readonly optionLetters = OPTION_LETTERS;

  protected readonly editingQuestion = computed(
    () => this.questions().find((q) => q.id === this.editingId()) ?? null,
  );

  protected readonly newCount = computed(
    () => this.questions().filter((q) => !q.isExisting).length,
  );
  protected readonly existingCount = computed(() => this.questions().length - this.newCount());

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reset();
      }
    });
  }

  private reset(): void {
    this.error.set('');
    this.titleError.set('');
    this.saving.set(false);
    this.step.set(this.mode() === 'edit' ? 2 : 1);
    this.title.set(this.mode() === 'edit' ? (this.quiz()?.title ?? '') : '');
    this.description.set(this.mode() === 'edit' ? (this.quiz()?.description ?? '') : '');
    this.categoryId.set(this.categories()[0]?.id ?? 0);
    this.level.set(this.mode() === 'edit' ? (this.quiz()?.level ?? 1) : 1);
    this.passScore.set(this.mode() === 'edit' ? (this.quiz()?.passScore ?? 70) : 70);
    this.questions.set(
      this.mode() === 'edit'
        ? (this.quiz()?.questions ?? []).map((q) => ({
            id: q.questionId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            categoryId: q.categoryId,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
            isExisting: true,
          }))
        : [],
    );
    this.questionText.set('');
    this.timeLimit.set(this.quiz()?.defaultTimeLimitInSeconds ?? 30);
    this.options.set(emptyOptions());
    this.editingId.set(null);
    this.deleteTarget.set(null);
    this.deletedExistingIds.set([]);
  }

  optionClassFor(index: number): string {
    return optionClass(index);
  }

  categoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? '-';
  }

  parseNumber(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  updateOptionText(index: number, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.options.update((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  }

  setCorrect(index: number): void {
    this.options.update((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  }

  editQuestion(id: string): void {
    const q = this.questions().find((item) => item.id === id);
    if (!q) {
      return;
    }
    this.error.set('');
    this.editingId.set(id);
    this.questionText.set(q.text);
    this.timeLimit.set(q.timeLimitInSeconds);
    this.options.set(q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.questionText.set('');
    this.timeLimit.set(30);
    this.options.set(emptyOptions());
  }

  handleAddQuestion(): void {
    this.error.set('');
    const trimmedText = this.questionText().trim();
    if (!trimmedText) {
      this.error.set('Lütfen soru metnini girin.');
      return;
    }
    if (this.options().some((o) => !o.text.trim())) {
      this.error.set('Lütfen 4 seçeneğin tamamını doldurun.');
      return;
    }
    if (this.options().filter((o) => o.isCorrect).length !== 1) {
      this.error.set('Lütfen tam olarak 1 doğru cevabı işaretleyin.');
      return;
    }

    const nextOptions = this.options().map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
    const editingId = this.editingId();

    if (editingId) {
      this.questions.update((prev) =>
        prev.map((q) =>
          q.id === editingId
            ? {
                ...q,
                text: trimmedText,
                timeLimitInSeconds: this.timeLimit(),
                options: nextOptions,
                dirty: q.isExisting ? true : q.dirty,
              }
            : q,
        ),
      );
      this.cancelEdit();
      return;
    }

    this.questions.update((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: trimmedText,
        timeLimitInSeconds: this.timeLimit(),
        categoryId: this.categoryId(),
        options: nextOptions,
      },
    ]);
    this.questionText.set('');
    this.options.set(emptyOptions());
  }

  removeQuestion(id: string): void {
    const q = this.questions().find((item) => item.id === id);
    if (!q) {
      return;
    }
    if (q.isExisting) {
      this.deleteTarget.set(q);
      return;
    }
    this.questions.update((prev) => prev.filter((item) => item.id !== id));
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    if (target.isExisting) {
      this.deletedExistingIds.update((prev) => [...prev, target.id]);
    }
    this.questions.update((prev) => prev.filter((q) => q.id !== target.id));
    this.deleteTarget.set(null);
  }

  correctText(question: BuilderQuestion): string {
    return question.options.find((o) => o.isCorrect)?.text ?? '?';
  }

  async handleSave(): Promise<void> {
    this.error.set('');
    this.saving.set(true);
    try {
      const payload = {
        targetRole: 'All',
        points: 1000,
      };
      const newQuestions = this.questions().filter((q) => !q.isExisting);
      const dirtyExisting = this.questions().filter((q) => q.isExisting && q.dirty);
      const deletedIds = this.deletedExistingIds();

      if (this.mode() === 'create') {
        const { id: quizId } = await this.api.createQuiz({
          title: this.title().trim(),
          description: this.description().trim(),
          categoryId: this.categoryId() > 0 ? this.categoryId() : null,
          level: this.level(),
          passScore: this.passScore(),
        });
        for (const q of newQuestions) {
          const { id: questionId } = await this.api.createQuestion({
            categoryId: q.categoryId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            ...payload,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          });
          await this.api.addQuestionToQuiz(quizId, questionId);
        }
        this.saved.emit(
          `"${this.title().trim()}" quizi ${newQuestions.length} soruyla kaydedildi.`,
        );
      } else if (this.quiz()) {
        await this.api.updateQuiz(this.quiz()!.id, {
          title: this.quiz()!.title,
          description: this.quiz()!.description,
          isActive: this.quiz()!.isActive,
          categoryId: this.quiz()!.categoryId,
          level: this.level(),
          passScore: this.passScore(),
          defaultTimeLimitInSeconds: this.quiz()!.defaultTimeLimitInSeconds,
          jokersEnabled: this.quiz()!.jokersEnabled,
        });
        for (const q of dirtyExisting) {
          await this.api.updateQuestion(q.id, {
            categoryId: q.categoryId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            ...payload,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          });
        }
        for (const questionId of deletedIds) {
          await this.api.removeQuestionFromQuiz(this.quiz()!.id, questionId);
        }
        for (const q of newQuestions) {
          const { id: questionId } = await this.api.createQuestion({
            categoryId: q.categoryId,
            text: q.text,
            timeLimitInSeconds: q.timeLimitInSeconds,
            ...payload,
            options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          });
          await this.api.addQuestionToQuiz(this.quiz()!.id, questionId);
        }

        const parts: string[] = [];
        if (newQuestions.length > 0) {
          parts.push(`${newQuestions.length} soru eklendi`);
        }
        if (dirtyExisting.length > 0) {
          parts.push(`${dirtyExisting.length} soru güncellendi`);
        }
        if (deletedIds.length > 0) {
          parts.push(`${deletedIds.length} soru silindi`);
        }
        this.saved.emit(
          parts.length > 0
            ? `"${this.quiz()!.title}" quizi güncellendi: ${parts.join(', ')}.`
            : 'Değişiklik yapılmadı.',
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const titleError = err.errors?.['Title']?.[0];
        if (titleError) {
          this.titleError.set(titleError);
          this.error.set(titleError);
          if (this.mode() === 'create') {
            this.step.set(1);
          }
        } else {
          this.error.set(err.message);
        }
      } else {
        this.error.set('Quiz kaydedilemedi.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
