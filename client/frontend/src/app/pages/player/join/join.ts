import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { RelayService } from '../../../services/relay.service';
import { environment } from '../../../../environments/environment';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
  private readonly relay = inject(RelayService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pinCode = signal('');
  readonly pinLocked = signal(false);
  readonly fullName = signal('');
  readonly error = signal('');

  private relayDisconnect: (() => void) | null = null;
  private joined = false;

  constructor() {
    const pin = this.route.snapshot.queryParamMap.get('pin');
    if (pin) {
      const digits = pin.replace(/\D/g, '');
      this.pinCode.set(digits);
      this.pinLocked.set(true);
    }
    if (environment.demo && this.pinCode()) {
      this.relayDisconnect = this.relay.connect(this.pinCode(), false);
      this.destroyRef.onDestroy(() => this.relayDisconnect?.());
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

    const [firstName, ...rest] = name.split(/\s+/);
    const playerId = `oyuncu-${Math.random().toString(36).slice(2, 10)}`;
    this.joined = true;

    // Fail-safe katılım: haberleşme yanıtı beklenmeden kullanıcı anında
    // Bekleme Salonu'na alınır. Gerçek kayıt arka planda yapılır; başarısız
    // olursa kullanıcıya asla hata/bekleme ekranı gösterilmez.
    this.sessions.savePlayer({
      sessionId: `relay-${pin}`,
      pinCode: pin,
      quizTitle: 'Sınava katılıyorsun…',
      playerId,
      playerName: name,
      isTeamMode: false,
      teamName: null,
      avatar: DEFAULT_AVATAR,
    });

    await this.router.navigate(['/player/lobby']);
    void this.registerInBackground({ pin, firstName, lastName: rest.join(' '), playerId });
  }

  private async registerInBackground(p: {
    pin: string;
    firstName: string;
    lastName: string;
    playerId: string;
  }): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const result = await this.api.joinGame({
          pinCode: p.pin,
          registrationNumber: this.sessions.getClientId(),
          firstName: p.firstName,
          lastName: p.lastName,
          department: 'Katılımcı',
          teamName: null,
          avatarEmoji: DEFAULT_AVATAR.emoji,
          avatarColor: DEFAULT_AVATAR.color,
          playerId: p.playerId,
        });
        const stored = this.sessions.loadPlayer();
        if (stored && stored.playerId === result.playerId) {
          this.sessions.savePlayer({
            ...stored,
            sessionId: result.sessionId,
            quizTitle: result.quizTitle,
          });
        }
        return;
      } catch (err) {
        const isNotFound = err instanceof ApiError && err.status === 404;
        if (!isNotFound) {
          return;
        }
        void this.relay.publish(p.pin, { type: 'request', pinCode: p.pin });
        await sleep(1000);
      }
    }
  }
}
