import { Component, input } from '@angular/core';

export type AlertVariant = 'error' | 'success' | 'info';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class AlertComponent {
  readonly variant = input<AlertVariant>('error');
  readonly message = input('');
}
