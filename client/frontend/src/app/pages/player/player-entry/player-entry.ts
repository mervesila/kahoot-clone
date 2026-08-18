import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { SessionService } from '../../../services/session.service';
import { getNtfyPublishUrl } from '../../../shared/ntfy-channel.util';
import { DEFAULT_AVATAR } from '../../../data/avatars';

@Component({
  selector: 'app-player-entry',
  imports: [
    AlertComponent,
    FormsModule,
    LogoComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './player-entry.html',
  styleUrl: './player-entry.scss',
})
export class PlayerEntryComponent {
  private readonly router = inject(Router);
  private readonly sessions = inject(SessionService);

  readonly pinCode = signal('');
  readonly nickname = signal('');
  readonly teamName = signal('');
  readonly error = signal('');
  readonly nicknameError = signal('');
  readonly loading = signal(false);

  onPinChange(value: string): void {
    this.pinCode.set(value.replace(/\D/g, ''));
  }

  onNicknameChange(value: string): void {
    this.nickname.set(value);
    if (this.nicknameError()) {
      this.nicknameError.set('');
    }
  }

  async handleJoin(): Promise<void> {
    this.error.set('');
    this.nicknameError.set('');

    const pin = this.pinCode().trim();
    const name = this.nickname().trim();

    if (!/^\d{4,6}$/.test(pin)) {
      this.error.set('PIN kodu hatalı. PIN kodunu kontrol edin.');
      return;
    }
    if (!name) {
      this.error.set('Ad Soyad bilgisi zorunludur.');
      return;
    }

    this.loading.set(true);

    const playerId = `oyuncu-${Math.random().toString(36).slice(2, 10)}`;
    const sessionId = `relay-${pin}-${playerId}`;

    // Optimistik katılım: anında lobide beklemeye başla.
    this.sessions.savePlayer({
      sessionId,
      pinCode: pin,
      quizTitle: 'Sınava katılıyorsun…',
      playerId,
      playerName: name,
      isTeamMode: false,
      teamName: this.teamName().trim() || null,
      avatar: DEFAULT_AVATAR,
    });

    // ntfy.sh kanalına PLAYER_JOINED mesajını hemen gönder.
    const payload = {
      type: 'PLAYER_JOINED',
      player: {
        id: Date.now(),
        name,
      },
      sessionId,
      teamName: this.teamName().trim() || null,
      avatarEmoji: DEFAULT_AVATAR.emoji,
      avatarColor: DEFAULT_AVATAR.color,
    };

    try {
      await fetch(getNtfyPublishUrl(pin), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[ntfy] Failed to publish PLAYER_JOINED', err);
    }

    this.loading.set(false);

    // Oyuncuyu bekleme ekranına al.
    await this.router.navigate(['/player/lobby']);
  }
}
