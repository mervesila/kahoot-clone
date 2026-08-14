import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { ApiError, ApiService } from '../../../services/api.service';
import { DEFAULT_AVATAR } from '../../../data/avatars';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-join-page',
  imports: [
    AlertComponent,
    FormsModule,
    LogoComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './join.html',
  styleUrl: './join.scss',
})
export class JoinPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly sessions = inject(SessionService);

  readonly pinCode = signal('');
  readonly pinLocked = signal(false);
  readonly fullName = signal('');
  readonly error = signal('');
  readonly loading = signal(false);

  constructor() {
    const pin = this.route.snapshot.queryParamMap.get('pin');
    if (pin) {
      const digits = pin.replace(/\D/g, '');
      this.pinCode.set(digits);
      this.pinLocked.set(true);
    }
  }

  onPinChange(value: string): void {
    if (this.pinLocked()) {
      return;
    }
    this.pinCode.set(value.replace(/\D/g, '').slice(0, 6));
  }

  async handleJoin(event?: Event): Promise<void> {
    event?.preventDefault();
    this.error.set('');

    const pin = this.pinCode().trim();
    const name = this.fullName().trim();

    if (!/^\d{4,6}$/.test(pin)) {
      this.error.set('PIN kodu hatalı. QR kodu tekrar okutun veya PIN kodunu kontrol edin.');
      return;
    }
    if (!name) {
      this.error.set('Ad Soyad bilgisi zorunludur.');
      return;
    }

    const [firstName, ...rest] = name.split(/\s+/);
    this.loading.set(true);
    try {
      const result = await this.api.joinGame({
        pinCode: pin,
        registrationNumber: this.sessions.getClientId(),
        firstName,
        lastName: rest.join(' '),
        department: 'Katılımcı',
        teamName: null,
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
        teamName: null,
        avatar: DEFAULT_AVATAR,
      });

      await this.router.navigate(['/player/lobby']);
    } catch (err) {
      if (err instanceof ApiError) {
        this.error.set(
          err.status === 409
            ? err.message
            : err.status === 404
              ? 'Bu PIN ile aktif bir sınav bulunamadı.'
              : err.message,
        );
      } else {
        this.error.set('Katılım sağlanamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
