import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiError, ApiService } from '../../services/api.service';
import type { CategoryDto } from '../../models/types';

@Component({
  selector: 'app-category-picker',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './category-picker.html',
  styleUrl: './category-picker.scss',
})
export class CategoryPickerComponent {
  private readonly api = inject(ApiService);

  @Input({ required: true }) categories: CategoryDto[] = [];
  @Input() selectedId: number | null = null;
  @Input() required = true;
  @Input() label = 'Kategori';

  @Output() readonly selectedIdChange = new EventEmitter<number | null>();
  @Output() readonly categoriesChange = new EventEmitter<CategoryDto[]>();

  protected readonly addMode = signal(false);
  protected readonly newName = signal('');
  protected readonly adding = signal(false);
  protected readonly error = signal('');

  onSelectionChange(value: number): void {
    this.selectedId = value;
    this.selectedIdChange.emit(value);
    this.error.set('');
  }

  toggleAddMode(): void {
    this.addMode.update((prev) => !prev);
    this.newName.set('');
    this.error.set('');
  }

  async addCategory(): Promise<void> {
    const name = this.newName().trim();
    if (!name) {
      this.error.set('Kategori adı boş olamaz.');
      return;
    }
    this.adding.set(true);
    this.error.set('');
    try {
      const { id } = await this.api.createCategory({ name });
      const created: CategoryDto = {
        id,
        name,
        description: null,
        questionCount: 0,
        isActive: true,
      };
      this.categories = [...this.categories, created];
      this.categoriesChange.emit(this.categories);
      this.selectedId = id;
      this.selectedIdChange.emit(id);
      this.addMode.set(false);
      this.newName.set('');
    } catch (err) {
      this.error.set(err instanceof ApiError ? err.message : 'Kategori eklenemedi.');
    } finally {
      this.adding.set(false);
    }
  }
}
