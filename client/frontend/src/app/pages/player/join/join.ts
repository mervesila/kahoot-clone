import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { SessionService } from '../../../services/session.service';
import { RelayService } from '../../../services/relay.service';
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

    // Optimistik katılım: anında lobidenekin.
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

    // Arka planda ntfy.sh rölesi üzerinden PLAYER_JOINED mesajı yayınla.
    void this.joinViaRelay({
      pin,
      firstName,
      lastName: rest.join(' '),
      playerId,
      name,
    });
  }

  /**
   * Oyuncunun katılımını tamamen istemci tarafında ntfy.sh rölesi
   * üzerinden iletir. Herhangi bir backend API çağrısı yapılmaz.
   *
   * Akış:
   *  1. tki-kahoot-pin-{PIN} kanalına WebSocket bağlan (duyuru beklemek için)
   *  2. Host'tan announce mesajı gelene kadar bekle
   *  3. Duyuru geldiğinde sessionId'yi al
   *  4. { type: 'join', sessionId, playerId, playerName } POST et
   *  5. Temizlik: disconnect
   */
  private async joinViaRelay(p: {
    pin: string;
    firstName: string;
    lastName: string;
    playerId: string;
    name: string;
  }): Promise<void> {
    const announced = await this.waitForAnnounce(p.pin);
    if (!announced) {
      return; // Host çevrimdışı; oyuncu lobide kalmaya devam eder.
    }

    const stored = this.sessions.loadPlayer();
    if (stored && stored.playerId === p.playerId) {
      this.sessions.savePlayer({
        ...stored,
        sessionId: announced.sessionId,
        quizTitle: announced.quizTitle,
      });
    }

    await this.relay.publish(p.pin, {
      type: 'join',
      sessionId: announced.sessionId,
      playerId: p.playerId,
      playerName: p.name,
      teamName: null,
      avatarEmoji: DEFAULT_AVATAR.emoji,
      avatarColor: DEFAULT_AVATAR.color,
    });
  }

  private waitForAnnounce(pin: string): Promise<RelayService['announced'] extends Map<string, infer V> ? V : never> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.relayDisconnect?.();
        this.relayDisconnect = null;
        resolve(null as never);
      }, 15000);

      this.relayDisconnect = this.relay.connect(pin, false, (msg) => {
        if (msg.type === 'announce' && msg.pinCode === pin) {
          clearTimeout(timeout);
          this.relayDisconnect?.();
          this.relayDisconnect = null;
          resolve(msg as never);
        }
      });
      this.destroyRef.onDestroy(() => {
        clearTimeout(timeout);
        this.relayDisconnect?.();
      });
    });
  }
}
