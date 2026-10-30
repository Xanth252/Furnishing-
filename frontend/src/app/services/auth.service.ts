import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { LoginRequest, LoginResponse } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl || '/api';

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, req).pipe(
      tap(res => { localStorage.setItem('token', res.token); localStorage.setItem('username', res.username); })
    );
  }

  logout() { localStorage.removeItem('token'); localStorage.removeItem('username'); this.router.navigate(['/login']); }
  getToken() { return localStorage.getItem('token'); }
  isLoggedIn() { return !!this.getToken(); }
  getUsername() { return localStorage.getItem('username') || ''; }
}
