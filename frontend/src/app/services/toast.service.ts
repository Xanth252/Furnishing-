import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', icon?: string, duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Auto-select friendly icon if not provided
    if (!icon) {
      switch (type) {
        case 'success': icon = '✅'; break;
        case 'warning': icon = '⚠️'; break;
        case 'error': icon = '❌'; break;
        default: icon = '✨'; break;
      }
    }

    const toast: Toast = { id, message, type, icon, duration };
    const current = this.toastsSubject.value;
    // Keep max 4 toasts
    this.toastsSubject.next([...current.slice(-3), toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, icon = '✅') {
    this.show(message, 'success', icon);
  }

  info(message: string, icon = 'ℹ️') {
    this.show(message, 'info', icon);
  }

  warning(message: string, icon = '⚠️') {
    this.show(message, 'warning', icon);
  }

  error(message: string, icon = '❌') {
    this.show(message, 'error', icon, 4500);
  }

  remove(id: string) {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
