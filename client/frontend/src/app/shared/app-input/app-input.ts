import { Component, input, model, output } from '@angular/core';

@Component({
  selector: 'app-input',
  templateUrl: './app-input.html',
  styleUrl: './app-input.scss',
})
export class AppInputComponent {
  readonly label = input('');
  readonly error = input('');
  readonly type = input('text');
  readonly placeholder = input('');
  readonly inputMode = input('');
  readonly maxLength = input<number | null>(null);
  readonly autocomplete = input('');
  readonly value = model('');

  readonly focusEvent = output<FocusEvent>();

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  onFocus(event: FocusEvent): void {
    this.focusEvent.emit(event);
  }
}
