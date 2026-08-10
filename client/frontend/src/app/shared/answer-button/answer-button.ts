import { Component, computed, input, output } from '@angular/core';
import { optionClass, optionLetter } from '../../data/options';

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'muted';

@Component({
  selector: 'app-answer-button',
  templateUrl: './answer-button.html',
  styleUrl: './answer-button.scss',
})
export class AnswerButtonComponent {
  readonly index = input.required<number>();
  readonly text = input('');
  readonly state = input<AnswerState>('idle');
  readonly disabled = input(false);

  readonly answered = output<void>();

  protected readonly letter = computed(() => optionLetter(this.index()));
  protected readonly colorClass = computed(() => optionClass(this.index()));
  protected readonly stateClass = computed(() => {
    switch (this.state()) {
      case 'correct':
        return 'state-correct';
      case 'wrong':
        return 'state-wrong';
      case 'muted':
        return 'state-muted';
      default:
        return 'state-idle';
    }
  });
  protected readonly extraClass = computed(() =>
    this.state() === 'idle' && this.disabled() ? 'state-disabled' : '',
  );
}
