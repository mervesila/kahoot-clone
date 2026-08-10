import { Component, model } from '@angular/core';
import { AVATAR_COLORS, AVATAR_EMOJIS, DEFAULT_AVATAR, type Avatar } from '../../data/avatars';

@Component({
  selector: 'app-avatar-picker',
  templateUrl: './avatar-picker.html',
  styleUrl: './avatar-picker.scss',
})
export class AvatarPickerComponent {
  readonly avatar = model<Avatar>(DEFAULT_AVATAR);

  protected readonly emojis = AVATAR_EMOJIS;
  protected readonly colors = AVATAR_COLORS;

  selectEmoji(emoji: string): void {
    this.avatar.update((current) => ({ ...current, emoji }));
  }

  selectColor(color: string): void {
    this.avatar.update((current) => ({ ...current, color }));
  }
}
