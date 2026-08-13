import { Component, input } from '@angular/core';
import { DEFAULT_AVATAR } from '../../data/avatars';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class AvatarComponent {
  readonly emoji = input('');
  readonly color = input('#2563eb');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly ring = input(false);
  readonly fallbackText = input('');

  get effectiveEmoji(): string {
    const value = this.emoji().trim();
    return value && value !== '❓' ? value : DEFAULT_AVATAR.emoji;
  }

  get effectiveColor(): string {
    return this.color().trim() || DEFAULT_AVATAR.color;
  }

  get effectiveFallback(): string {
    const text = this.fallbackText().trim();
    return text ? text.charAt(0).toLocaleUpperCase('tr') : '';
  }
}
