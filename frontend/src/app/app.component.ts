import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet />
    
    <!-- Global Interactive Toast Container -->
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      <div 
        *ngFor="let toast of toastService.toasts$ | async" 
        class="toast-item"
        [ngClass]="'toast-' + toast.type"
        (click)="toastService.remove(toast.id)">
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button type="button" class="toast-close" (click)="toastService.remove(toast.id); $event.stopPropagation()">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 420px;
      width: calc(100vw - 48px);
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 12px 30px -4px rgba(15, 23, 42, 0.18), 0 4px 10px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transition: transform 0.15s, opacity 0.15s;
    }
    .toast-item:hover {
      transform: translateY(-2px);
    }
    @keyframes slideInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast-icon {
      font-size: 1.15rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .toast-message {
      flex: 1;
      line-height: 1.4;
    }
    .toast-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
      transition: color 0.15s;
    }
    .toast-close:hover {
      color: #0f172a;
    }
    .toast-success {
      border-left: 5px solid #10b981;
      background: linear-gradient(to right, #f0fdf4 0%, #ffffff 15%);
    }
    .toast-info {
      border-left: 5px solid #6366f1;
      background: linear-gradient(to right, #eef2ff 0%, #ffffff 15%);
    }
    .toast-warning {
      border-left: 5px solid #f59e0b;
      background: linear-gradient(to right, #fffbeb 0%, #ffffff 15%);
    }
    .toast-error {
      border-left: 5px solid #ef4444;
      background: linear-gradient(to right, #fef2f2 0%, #ffffff 15%);
    }
  `]
})
export class AppComponent {
  constructor(public toastService: ToastService) {}
}
