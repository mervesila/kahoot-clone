import { Component, input } from '@angular/core';
import { DEFAULT_AVATAR } from '../../data/avatars';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class AvatarComponent {
  readonly emoji = input('');
  readonly color = input('#e2257b');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly ring = input(false);

  get effectiveEmoji(): string {
    const value = this.emoji().trim();
    return value && value !== '❓' ? value : DEFAULT_AVATAR.emoji;
  }

  get effectiveColor(): string {
    return this.color().trim() || DEFAULT_AVATAR.color;
  }
}
