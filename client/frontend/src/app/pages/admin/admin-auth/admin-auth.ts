import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertComponent } from '../../../shared/alert/alert';
import { LogoComponent } from '../../../shared/logo/logo';
import { ApiError } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { SESSION_TIMEOUT_FLAG, SESSION_TIMEOUT_MESSAGE, SESSION_TIMEOUT_QUERY } from '../../../services/idle-timeout.service';

@Component({
  selector: 'app-admin-auth',
  imports: [
    AlertComponent,
    FormsModule,
    LogoComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './admin-auth.html',
  styleUrl: './admin-auth.scss',
})
export class AdminAuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly registrationNumber = signal('');
  readonly password = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly submitted = signal(false);

  readonly registrationNumberError = computed(() => {
    if (this.registrationNumber().trim()) {
      return '';
    }
    return this.submitted() || this.registrationNumber() !== '' ? 'Sicil numarası zorunludur.' : '';
  });

  readonly passwordError = computed(() => {
    if (!this.submitted() && this.password() === '') {
      return '';
    }
    return this.password() ? '' : 'Parola zorunludur.';
  });

  readonly valid = computed(
    () => !this.registrationNumberError() && !this.passwordError(),
  );

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    }
    const timedOut = this.route.snapshot.queryParamMap.get(SESSION_TIMEOUT_QUERY) === '1';
    if (timedOut || localStorage.getItem(SESSION_TIMEOUT_FLAG) === '1') {
      this.error.set(SESSION_TIMEOUT_MESSAGE);
      localStorage.removeItem(SESSION_TIMEOUT_FLAG);
    }
  }

  async handleSubmit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');

    if (!this.valid()) {
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.login(this.registrationNumber().trim(), this.password());
      await this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    } catch (err) {
      this.setApiError(err);
    } finally {
      this.loading.set(false);
    }
  }

  private setApiError(err: unknown): void {
    if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
      this.error.set('Sicil numarası veya parola hatalı!');
    } else {
      this.error.set(err instanceof ApiError ? err.message : 'Giriş başarısız.');
    }
  }
}
