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
import type { CategoryDto } from '../../../models/types';

export interface QuizCreateData {
  categories: CategoryDto[];
}

export interface QuizCreateResult {
  id: string;
  title: string;
  categoryId: number;
}

@Component({
  selector: 'app-quiz-create-dialog',
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
  templateUrl: './quiz-create-dialog.html',
  styleUrl: './quiz-create-dialog.scss',
})
export class QuizCreateDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuizCreateDialogComponent>);
  private readonly api = inject(ApiService);
  protected readonly data = inject<QuizCreateData>(MAT_DIALOG_DATA);

  protected readonly categories = signal(this.data.categories);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly level = signal(1);
  protected readonly passScore = signal(70);
  protected readonly defaultTime = signal(30);
  protected readonly isActive = signal(true);
  protected readonly jokersEnabled = signal(true);

  protected readonly timeOptions = [10, 20, 30, 60];

  protected readonly saving = signal(false);
  protected readonly error = signal('');

  onCategoriesChange(categories: CategoryDto[]): void {
    this.categories.set(categories);
  }

  onCategoryChange(id: number | null): void {
    this.categoryId.set(id);
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
      const { id } = await this.api.createQuiz({
        title: trimmed,
        description: this.description(),
        isActive: this.isActive(),
        categoryId: this.categoryId(),
        level: this.level(),
        passScore: this.passScore(),
        defaultTimeLimitInSeconds: this.defaultTime(),
        jokersEnabled: this.jokersEnabled(),
      });
      this.dialogRef.close({
        id,
        title: trimmed,
        categoryId: this.categoryId() as number,
      } satisfies QuizCreateResult);
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Sınav oluşturulamadı.');
    } finally {
      this.saving.set(false);
    }
  }
}
