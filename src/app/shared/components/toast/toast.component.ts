import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
        <!-- Icono según el tipo -->
        @switch (alert.type) {
          @case ('success') {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21.801 10A10 10 0 1 1 17 3.335" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          }
          @case ('error') {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          }
          @default {
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          }
        }
        <p class="text-sm font-medium">{{ alert.text }}</p>
      </div>
    }
  `,
})
export class ToastComponent implements OnInit {
  alert: AlertMessage | null = null;

  constructor(
    private notify: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.notify.currentAlert.subscribe((msg) => {
      this.alert = msg;
      this.cdr.markForCheck();
    });
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
}
