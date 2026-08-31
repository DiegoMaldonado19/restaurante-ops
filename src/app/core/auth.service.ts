import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiConfig } from '../api-config';

export type UserRole = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';

/** Copia del LoginView del backend, en snake_case porque asi viaja en el JSON. */
export interface Session {
  access_token: string;
  role: UserRole;
  user_id: number;
  full_name: string;
}

const SESSION_KEY = 'session';

/**
 * Unico estado global real de la aplicacion. El token vive en localStorage y todo
 * acceso va detras de isPlatformBrowser: server.ts es un proceso compartido por todos
 * los usuarios y el renderizado en servidor nunca debe ver el token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfig);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly session = signal<Session | null>(this.restore());

  readonly token = computed(() => this.session()?.access_token ?? null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly fullName = computed(() => this.session()?.full_name ?? '');
  readonly isAuthenticated = computed(() => this.session() !== null);

  async login(username: string, password: string): Promise<Session> {
    const session = await firstValueFrom(
      this.http.post<Session>(`${this.api.apiBaseUrl}/api/v1/auth/login`, { username, password }),
    );

    this.session.set(session);
    this.persist(session);

    return session;
  }

  /**
   * Solo del cliente: con un JWT sin estado el servidor no puede invalidar nada, asi
   * que no existe POST /auth/logout.
   */
  logout(): void {
    this.session.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.role();

    return role !== null && roles.includes(role);
  }

  private persist(session: Session): void {
    if (this.isBrowser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  private restore(): Session | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = localStorage.getItem(SESSION_KEY);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as Session;
    } catch {
      // Sesion corrupta: se descarta en vez de dejar la aplicacion sin arrancar.
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
