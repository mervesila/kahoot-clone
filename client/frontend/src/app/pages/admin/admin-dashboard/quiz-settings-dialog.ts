import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiError, ApiService } from '../../../services/api.service';
import { CategoryPickerComponent } from '../../../shared/category-picker/category-picker';
import type { CategoryDto, QuizDto, UpdateQuizRequest } from '../../../models/types';

export interface QuizSettingsData {
  quiz: QuizDto;
  categories: CategoryDto[];
}

@Component({
  selector: 'app-quiz-settings-dialog',
  imports: [
    CategoryPickerComponent,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './quiz-settings-dialog.html',
  styleUrl: './quiz-settings-dialog.scss',
})
export class QuizSettingsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuizSettingsDialogComponent>);
  private readonly api = inject(ApiService);
  protected readonly data = inject<QuizSettingsData>(MAT_DIALOG_DATA);

  readonly quiz = this.data.quiz;
  readonly categories = signal(this.data.categories);

  readonly title = signal(this.quiz.title);
  readonly description = signal(this.quiz.description);
  readonly categoryId = signal<number | null>(this.quiz.categoryId ?? null);
  readonly level = signal(this.quiz.level);
  readonly passScore = signal(this.quiz.passScore);
  readonly defaultTime = signal(this.quiz.defaultTimeLimitInSeconds);
  readonly isActive = signal(this.quiz.isActive);

  protected readonly timeOptions = [10, 20, 30, 60];

  protected readonly saving = signal(false);
  protected readonly error = signal('');

  onCategoriesChange(categories: CategoryDto[]): void {
    this.categories.set(categories);
  }

  onCategoryChange(value: number | null): void {
    this.categoryId.set(value);
    this.error.set('');
  }

  close(): void {
    if (!this.saving()) {
      this.dialogRef.close();
    }
  }

  async save(): Promise<void> {
    const trimmed = this.title().trim();
    if (!trimmed) {
      this.error.set('Sınav adı boş olamaz.');
      return;
    }
    if (this.categoryId() === null) {
      this.error.set('Sınav için bir kategori seçilmelidir.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const updates: UpdateQuizRequest = {
        title: trimmed,
        description: this.description(),
        isActive: this.isActive(),
        categoryId: this.categoryId(),
        level: this.level(),
        passScore: this.passScore(),
        defaultTimeLimitInSeconds: this.defaultTime(),
      };
      await this.api.updateQuiz(this.quiz.id, updates);
      this.dialogRef.close(updates);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Sınav ayarları kaydedilemedi.');
    } finally {
      this.saving.set(false);
    }
  }
}
