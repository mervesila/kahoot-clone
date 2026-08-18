import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { SessionService } from '../../../services/session.service';
import { getNtfyPublishUrl } from '../../../shared/ntfy-channel.util';
import { DEFAULT_AVATAR } from '../../../data/avatars';

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
  private readonly sessions = inject(SessionService);

  readonly pinCode = signal('');
  readonly pinLocked = signal(false);
  readonly fullName = signal('');
  readonly error = signal('');

  private joined = false;

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
    if (this.joined) {
      return;
    }
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

    const playerId = `oyuncu-${Math.random().toString(36).slice(2, 10)}`;
    const sessionId = `relay-${pin}-${playerId}`;
    this.joined = true;

    // Optimistik katılım: anında lobide beklemeye başla.
    this.sessions.savePlayer({
      sessionId,
      pinCode: pin,
      quizTitle: 'Sınava katılıyorsun…',
      playerId,
      playerName: name,
      isTeamMode: false,
      teamName: null,
      avatar: DEFAULT_AVATAR,
    });

    // ntfy.sh kanalına PLAYER_JOINED mesajını hemen gönder (arka plan, bekleme yok).
    const payload = {
      type: 'PLAYER_JOINED',
      player: {
        id: Date.now(),
        name,
      },
      sessionId,
      teamName: null,
      avatarEmoji: DEFAULT_AVATAR.emoji,
      avatarColor: DEFAULT_AVATAR.color,
    };

    fetch(getNtfyPublishUrl(pin), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    }).catch((err) => console.error('[ntfy] Failed to publish PLAYER_JOINED', err));

    // Oyuncuyu hemen bekleme ekranına al — POST sonucunu bekleme.
    await this.router.navigate(['/player/lobby']);
  }
}
