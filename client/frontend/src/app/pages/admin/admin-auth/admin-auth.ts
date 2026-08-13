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

type Mode = 'login' | 'register';

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

  readonly mode = signal<Mode>('login');
  readonly registrationNumber = signal('');
  readonly password = signal('');
  readonly passwordConfirm = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly department = signal('');
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
    if (!this.password()) {
      return 'Parola zorunludur.';
    }
    if (this.mode() === 'register' && this.password().length < 6) {
      return 'Parola en az 6 karakter olmalıdır.';
    }
    return '';
  });

  readonly firstNameError = computed(() =>
    this.mode() !== 'register' || this.firstName().trim()
      ? ''
      : this.submitted() || this.firstName() !== ''
        ? 'Ad zorunludur.'
        : '',
  );

  readonly lastNameError = computed(() =>
    this.mode() !== 'register' || this.lastName().trim()
      ? ''
      : this.submitted() || this.lastName() !== ''
        ? 'Soyad zorunludur.'
        : '',
  );

  readonly departmentError = computed(() =>
    this.mode() !== 'register' || this.department().trim()
      ? ''
      : this.submitted() || this.department() !== ''
        ? 'Departman zorunludur.'
        : '',
  );

  readonly passwordConfirmError = computed(() => {
    if (this.mode() !== 'register') {
      return '';
    }
    if (!this.passwordConfirm()) {
      return this.submitted() || this.passwordConfirm() !== '' ? 'Parola tekrarı zorunludur.' : '';
    }
    return this.passwordConfirm() !== this.password() ? 'Parolalar eşleşmiyor.' : '';
  });

  readonly valid = computed(
    () =>
      !this.registrationNumberError() &&
      !this.passwordError() &&
      !this.firstNameError() &&
      !this.lastNameError() &&
      !this.departmentError() &&
      !this.passwordConfirmError(),
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

  setMode(mode: Mode): void {
    this.error.set('');
    this.submitted.set(false);
    this.mode.set(mode);
  }

  async handleSubmit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');

    if (!this.valid()) {
      return;
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.registrationNumber().trim(), this.password());
      } else {
        await this.auth.register({
          registrationNumber: this.registrationNumber().trim(),
          password: this.password(),
          firstName: this.firstName().trim(),
          lastName: this.lastName().trim(),
          department: this.department().trim(),
        });
      }
      await this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    } catch (err) {
      this.setApiError(err);
    } finally {
      this.loading.set(false);
    }
  }

  private setApiError(err: unknown): void {
    if (
      this.mode() === 'login' &&
      err instanceof ApiError &&
      (err.status === 400 || err.status === 401 || err.status === 500)
    ) {
      this.error.set('Sicil numarası veya parola hatalı!');
    } else {
      this.error.set(err instanceof ApiError ? err.message : 'İşlem başarısız.');
    }
  }
}
