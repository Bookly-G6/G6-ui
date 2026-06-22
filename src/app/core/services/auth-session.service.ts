import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { NotificationService } from '../../services/notification';
import { SessionRole, SessionUser } from '../models/session-user.model';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'bookly.session.user';
const TOKEN_STORAGE_KEY = 'bookly.session.token';

interface AuthResponse {
  token: string;
  idUsuario: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'CLIENTE' | 'ADMIN';
}

interface MeResponse {
  idUsuario: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'CLIENTE' | 'ADMIN';
}

interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  dni?: string;
  telefono?: string;
}

interface JwtPayload {
  sub: string;
  roles?: string[];
  iat: number;
  exp: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApiUrl = `${environment.apiUrl}/auth`;
  readonly currentUser = signal<SessionUser | null>(this.loadStoredUser());
  readonly role = computed<SessionRole>(() => this.currentUser()?.role ?? 'guest');
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor(
    private readonly http: HttpClient,
    private readonly notification: NotificationService,
  ) {}

  login(email: string, password: string): Observable<SessionUser> {
    return this.http
      .post<AuthResponse>(`${this.authApiUrl}/login`, {
        email,
        password,
      })
      .pipe(
        tap((authResponse) => this.persistSession(this.mapAuthResponseToSessionUser(authResponse))),
        map((authResponse) => this.mapAuthResponseToSessionUser(authResponse)),
      );
  }

  register(payload: RegisterPayload): Observable<SessionUser> {
    return this.http.post<AuthResponse>(`${this.authApiUrl}/register`, payload).pipe(
      tap((authResponse) => {
        this.persistSession(this.mapAuthResponseToSessionUser(authResponse));
        this.notification.show('Registro exitoso. Bienvenido a Bookly.', 'success');
      }),
      map((authResponse) => this.mapAuthResponseToSessionUser(authResponse)),
    );
  }

  syncCurrentUser(): Observable<SessionUser> {
    return this.http.get<MeResponse>(`${this.authApiUrl}/me`).pipe(
      tap((meResponse) => {
        const sessionUser = this.mapMeResponseToSessionUser(meResponse);
        this.persistSession(sessionUser);
      }),
      map((meResponse) => this.mapMeResponseToSessionUser(meResponse)),
      catchError(() => {
        this.logout();
        throw new Error('Session expired or invalid');
      }),
    );
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.notification.show('Sesión finalizada.', 'info');
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private mapAuthResponseToSessionUser(authResponse: AuthResponse): SessionUser {
    return {
      id: authResponse.idUsuario,
      nombre: `${authResponse.nombre} ${authResponse.apellido}`.trim(),
      email: authResponse.email,
      role: this.normalizeRole(authResponse.rol),
      token: authResponse.token,
    };
  }

  private mapMeResponseToSessionUser(meResponse: MeResponse): SessionUser {
    return {
      id: meResponse.idUsuario,
      nombre: `${meResponse.nombre} ${meResponse.apellido}`.trim(),
      email: meResponse.email,
      role: this.normalizeRole(meResponse.rol),
    };
  }

  private normalizeRole(backendRole: 'CLIENTE' | 'ADMIN'): SessionRole {
    if (backendRole === 'ADMIN') {
      return 'admin';
    }
    return 'cliente';
  }

  private persistSession(sessionUser: SessionUser): void {
    this.currentUser.set(sessionUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    if (sessionUser.token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, sessionUser.token);
    }
  }

  private loadStoredUser(): SessionUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
  }
}
