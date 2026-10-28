import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../../models';
import { safeGetItem, safeRemoveItem, safeSetItem } from './storage.util';

const TOKEN_KEY = 'mf_token';
const USER_KEY = 'mf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly tokenSignal = signal<string | null>(safeGetItem(TOKEN_KEY));
  private readonly userSignal = signal<User | null>(this.readStoredUser());

  readonly user = this.userSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private readonly http: HttpClient) {}

  private readStoredUser(): User | null {
    const raw = safeGetItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, payload)
      .pipe(tap((res) => this.persistSession(res)));
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, { token, password });
  }

  fetchCurrentUser(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/me`).pipe(
      tap((res) => {
        this.userSignal.set(res.user);
        safeSetItem(USER_KEY, JSON.stringify(res.user));
      })
    );
  }

  private persistSession(res: AuthResponse): void {
    this.tokenSignal.set(res.token);
    this.userSignal.set(res.user);
    safeSetItem(TOKEN_KEY, res.token);
    safeSetItem(USER_KEY, JSON.stringify(res.user));
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    safeRemoveItem(TOKEN_KEY);
    safeRemoveItem(USER_KEY);
  }
}
