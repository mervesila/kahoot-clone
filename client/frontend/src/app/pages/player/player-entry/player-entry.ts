import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertComponent } from '../../../shared/alert/alert';
import { AppButtonComponent } from '../../../shared/app-button/app-button';
import { AppInputComponent } from '../../../shared/app-input/app-input';
import { AvatarComponent } from '../../../shared/avatar/avatar';
import { AvatarPickerComponent } from '../../../shared/avatar-picker/avatar-picker';
import { LogoComponent } from '../../../shared/logo/logo';
import { ApiError, ApiService } from '../../../services/api.service';
import { DEFAULT_AVATAR, type Avatar } from '../../../data/avatars';
import { GameHubService } from '../../../services/game-hub.service';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-player-entry',
  imports: [
    AlertComponent,
    AppButtonComponent,
    AppInputComponent,
    AvatarComponent,
    AvatarPickerComponent,
    FormsModule,
    LogoComponent,
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
  readonly avatar = signal<Avatar>(DEFAULT_AVATAR);
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
      this.error.set('Takma adını girmelisin.');
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.api.joinGame({
        pinCode: this.pinCode().trim(),
        registrationNumber: this.sessions.getClientId(),
        firstName: this.nickname().trim(),
        lastName: '',
        department: 'Oyuncu',
        teamName: this.teamName().trim() || null,
        avatarEmoji: this.avatar().emoji,
        avatarColor: this.avatar().color,
      });

      this.sessions.savePlayer({
        sessionId: result.sessionId,
        pinCode: result.pinCode,
        quizTitle: result.quizTitle,
        playerId: result.playerId,
        playerName: result.playerName,
        isTeamMode: false,
        teamName: this.teamName().trim() || null,
        avatar: this.avatar(),
      });

      await this.hub.getConnection();
      await this.hub.joinGameGroup(result.sessionId);
      await this.hub.updatePlayerAvatar(
        result.sessionId,
        result.playerId,
        this.avatar().emoji,
        this.avatar().color,
      );

      await this.router.navigate(['/player/lobby']);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          this.nicknameError.set(err.message);
        } else {
          this.error.set(
            err.status === 404
              ? 'Bu PIN ile aktif bir oyun bulunamadı. PIN kodu kontrol et.'
              : err.message,
          );
        }
      } else {
        this.error.set('Sunucuya bağlanılamadı. Lütfen tekrar dene.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
