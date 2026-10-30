import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="login-page">
      <!-- Decorative ambient glows -->
      <div class="ambient-glow glow-1"></div>
      <div class="ambient-glow glow-2"></div>

      <div class="login-content">
        <div class="login-logo-wrap">
          <img src="assets/logo.png" alt="PFC Logo" class="login-logo" />
        </div>

        <div class="brand-badge-pill">Enterprise Interior CRM</div>
        <h1 class="login-title">PUKALE FURNISHING CENTRE</h1>
        <p class="login-subtitle">Sign in to access quotations, customers &amp; calculation tools</p>

        <div class="login-card">
          <div class="card-header-inner">
            <h2 class="card-heading">Welcome Back</h2>
            <p class="card-subheading">Enter your credentials to continue</p>
          </div>

          <form (ngSubmit)="login()">
            <div class="form-group">
              <label>Username</label>
              <div class="input-icon-wrap">
                <span class="field-icon">👤</span>
                <input 
                  class="form-control with-icon" 
                  [(ngModel)]="username" 
                  name="username"
                  placeholder="Enter username" 
                  required 
                  autocomplete="username" />
              </div>
            </div>

            <div class="form-group">
              <label>Password</label>
              <div class="input-icon-wrap">
                <span class="field-icon">🔒</span>
                <input 
                  class="form-control with-icon" 
                  [type]="showPassword ? 'text' : 'password'" 
                  [(ngModel)]="password" 
                  name="password"
                  placeholder="Enter password" 
                  required 
                  autocomplete="current-password" />
                <button 
                  type="button" 
                  class="toggle-pwd-btn" 
                  (click)="showPassword = !showPassword"
                  title="{{ showPassword ? 'Hide password' : 'Show password' }}">
                  {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            <button class="btn btn-primary login-btn" type="submit" [disabled]="loading">
              <span *ngIf="loading" class="login-spinner"></span>
              <span>{{ loading ? 'Signing in...' : 'Sign In to Dashboard' }}</span>
              <span *ngIf="!loading">→</span>
            </button>

            <div class="error-msg" *ngIf="error">
              <span>⚠️</span>
              <span>{{ error }}</span>
            </div>

            <div class="demo-hint-box">
              <span class="hint-label">Default Login:</span>
              <code>admin</code> / <code>admin123</code>
            </div>
          </form>
        </div>

        <div class="login-footer">
          <span>Pukale Furnishing Centre &copy; {{ year }}</span>
          <span class="footer-dot">·</span>
          <span>Crafted for Fine Living</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .ambient-glow {
      position: absolute;
      width: 480px;
      height: 480px;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      opacity: 0.5;
    }
    .glow-1 {
      top: 10%;
      left: 20%;
      background: radial-gradient(circle, rgba(199, 210, 254, 0.6) 0%, rgba(224, 231, 255, 0) 70%);
    }
    .glow-2 {
      bottom: 10%;
      right: 20%;
      background: radial-gradient(circle, rgba(254, 243, 199, 0.5) 0%, rgba(255, 251, 235, 0) 70%);
    }

    .brand-badge-pill {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: #e0e7ff;
      color: #3730a3;
      padding: 3px 12px;
      border-radius: 9999px;
      margin-bottom: 10px;
      border: 1px solid #c7d2fe;
    }

    .card-header-inner {
      margin-bottom: 22px;
      text-align: left;
    }
    .card-heading {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .card-subheading {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 2px;
    }

    .input-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 12px;
      font-size: 0.95rem;
      color: #94a3b8;
      pointer-events: none;
      line-height: 1;
    }
    .form-control.with-icon {
      padding-left: 38px;
    }
    .toggle-pwd-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      font-size: 0.95rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0.65;
      transition: opacity 0.15s;
    }
    .toggle-pwd-btn:hover {
      opacity: 1;
    }

    .demo-hint-box {
      margin-top: 18px;
      padding: 9px 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      font-size: 0.76rem;
      color: #64748b;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .hint-label { font-weight: 600; color: #475569; }
    .demo-hint-box code {
      background: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #0f172a;
    }

    .login-spinner {
      width: 15px; height: 15px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .login-footer {
      margin-top: 28px;
      font-size: 0.75rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-dot { color: #cbd5e1; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';
  year = new Date().getFullYear();

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.loading = true;
    this.error = '';
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err.error?.message || err.message || 'Invalid username or password';
        this.loading = false;
      }
    });
  }
}
