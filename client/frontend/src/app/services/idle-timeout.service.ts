import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, throttleTime, type Observable, type Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

export const SESSION_TIMEOUT_FLAG = 'tki_session_timeout';
export const SESSION_TIMEOUT_QUERY = 'timeout';
export const SESSION_TIMEOUT_MESSAGE = 'Süre aşımı nedeniyle oturumunuz sonlandırılmıştır.';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'] as const;

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  private activity$: Observable<Event> | null = null;
  private activitySub: Subscription | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.activitySub) {
      return;
    }
    this.activity$ = merge(...ACTIVITY_EVENTS.map((event) => fromEvent(document, event, { passive: true }))).pipe(
      throttleTime(500),
    );
    this.activitySub = this.activity$.subscribe(() => this.arm());
    this.arm();
  }

  stop(): void {
    this.activitySub?.unsubscribe();
    this.activitySub = null;
    this.activity$ = null;
    this.clearTimer();
  }

  private arm(): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.handleTimeout(), IDLE_TIMEOUT_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private handleTimeout(): void {
    this.stop();
    this.auth.logout();
    this.session.clearHost();
    this.session.clearPlayer();
    localStorage.setItem(SESSION_TIMEOUT_FLAG, '1');
    void this.router.navigate(['/login'], { queryParams: { [SESSION_TIMEOUT_QUERY]: '1' }, replaceUrl: true });
  }
}
