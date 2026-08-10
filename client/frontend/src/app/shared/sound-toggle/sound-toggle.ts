import { Component, input, signal } from '@angular/core';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-sound-toggle',
  templateUrl: './sound-toggle.html',
  styleUrl: './sound-toggle.scss',
})
export class SoundToggleComponent {
  readonly positionClass = input('');

  protected readonly muted = signal(false);

  constructor(private audio: AudioService) {
    this.muted.set(audio.isMuted());
  }

  toggle(): void {
    this.muted.set(this.audio.toggleMuted());
  }
}
