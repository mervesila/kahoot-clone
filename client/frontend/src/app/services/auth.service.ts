import { Injectable, computed, signal } from '@angular/core';
import { ApiService, setToken, type RegisterRequest } from './api.service';
import type { AuthResult } from '../models/types';

export const USER_KEY = 'tki_admin_user';

export function readUser(): AuthResult | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthResult;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthResult | null>(readUser());
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(private api: ApiService) {}

  private applyAuth(result: AuthResult): void {
    setToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result));
    this.userSignal.set(result);
  }

  async login(registrationNumber: string, password: string): Promise<void> {
    const result = await this.api.login({ registrationNumber, password });
    this.applyAuth(result);
  }

  async register(data: RegisterRequest): Promise<void> {
    const result = await this.api.register(data);
    this.applyAuth(result);
  }

  logout(): void {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }
}
