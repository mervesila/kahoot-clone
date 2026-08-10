import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'white' | 'ghost' | 'red' | 'green' | 'yellow' | 'blue';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  templateUrl: './app-button.html',
  styleUrl: './app-button.scss',
})
export class AppButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly full = input(false);
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');

  protected readonly isDisabled = computed(() => this.disabled() || this.loading());
  protected readonly variantClass = computed(() => `btn-${this.variant()}`);
  protected readonly sizeClass = computed(() => `btn-${this.size()}`);
}
