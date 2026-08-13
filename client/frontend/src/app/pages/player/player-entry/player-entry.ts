import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { ApiError, ApiService } from '../../../services/api.service';
import { DEFAULT_AVATAR } from '../../../data/avatars';
import { GameHubService } from '../../../services/game-hub.service';
import { SessionService } from '../../../services/session.service';

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
  private readonly api = inject(ApiService);
  private readonly sessions = inject(SessionService);
  private readonly hub = inject(GameHubService);

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

    if (!/^\d{6}$/.test(this.pinCode().trim())) {
      this.error.set('PIN kodu 6 haneli olmalıdır.');
      return;
    }
    if (!this.nickname().trim()) {
      this.error.set('Ad Soyad bilgisi zorunludur.');
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.api.joinGame({
        pinCode: this.pinCode().trim(),
        registrationNumber: this.sessions.getClientId(),
        firstName: this.nickname().trim(),
        lastName: '',
        department: 'Katılımcı',
        teamName: this.teamName().trim() || null,
        avatarEmoji: DEFAULT_AVATAR.emoji,
        avatarColor: DEFAULT_AVATAR.color,
      });

      this.sessions.savePlayer({
        sessionId: result.sessionId,
        pinCode: result.pinCode,
        quizTitle: result.quizTitle,
        playerId: result.playerId,
        playerName: result.playerName,
        isTeamMode: false,
        teamName: this.teamName().trim() || null,
        avatar: DEFAULT_AVATAR,
      });

      await this.hub.getConnection();
      await this.hub.joinGameGroup(result.sessionId);

      await this.router.navigate(['/player/lobby']);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          this.nicknameError.set(err.message);
        } else {
          this.error.set(
            err.status === 404
              ? 'Bu PIN ile aktif bir sınav bulunamadı. PIN kodunu kontrol edin.'
              : err.message,
          );
        }
      } else {
        this.error.set('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
