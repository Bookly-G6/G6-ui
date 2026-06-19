import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AlertMessage } from '../../../services/notification';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (alert) {
      <div
        [class]="getBadgeClass()"
        class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <span class="text-base">{{ getIcon() }}</span>
        <p class="text-sm font-medium">{{ alert.text }}</p>
      </div>
    }
  `,
})
export class ToastComponent implements OnInit {
  alert: AlertMessage | null = null;

  constructor(private notify: NotificationService) {}

  ngOnInit(): void {
    this.notify.currentAlert.subscribe((msg) => (this.alert = msg));
  }

  getBadgeClass(): string {
    if (this.alert?.type === 'success') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (this.alert?.type === 'error') {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }

  getIcon(): string {
    if (this.alert?.type === 'success') return '✅';
    if (this.alert?.type === 'error') return '❌';
    return 'ℹ️';
  }
}
