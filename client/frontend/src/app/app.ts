import { Component, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';
import { IdleTimeoutService } from './services/idle-timeout.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly idle = inject(IdleTimeoutService);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncIdle());
    effect(() => {
      this.auth.isAuthenticated();
      this.syncIdle();
    });
    this.syncIdle();
  }

  private syncIdle(): void {
    const onAdmin = this.router.url.startsWith('/admin');
    if (this.auth.isAuthenticated() && onAdmin) {
      this.idle.start();
    } else {
      this.idle.stop();
    }
  }
}
