import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
  animations: [
    trigger('imageSwap', [transition('* => *', [animate('520ms cubic-bezier(.22,.75,.26,1)')])]),
    trigger('formSwapPanel', [
      transition('* => *', [animate('520ms cubic-bezier(.22,.75,.26,1)')]),
    ]),
    trigger('formSwap', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.97)' }),
        animate('280ms ease', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ]),
      transition(':leave', [
        animate('210ms ease', style({ opacity: 0, transform: 'translateY(-10px) scale(0.98)' })),
      ]),
    ]),
  ],
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly notification = inject(NotificationService);

  readonly isRegister = signal(false);
  readonly loading = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    dni: [''],
    telefono: [''],
  });

  toggleMode(): void {
    this.isRegister.update((value) => !value);
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.loginForm.getRawValue();

    this.authSession.login(email, password).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.notification.show(`Bienvenido ${user.nombre}.`, 'success');
        this.router.navigateByUrl(user.role === 'admin' ? '/admin' : '/');
      },
      error: (error) => {
        this.loading.set(false);
        const message = error?.error?.message ?? error?.message ?? 'No fue posible iniciar sesión.';
        this.notification.show(message, 'error');
      },
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.authSession.register(this.registerForm.getRawValue()).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.router.navigateByUrl(user.role === 'admin' ? '/admin' : '/');
      },
      error: (error) => {
        this.loading.set(false);
        const message =
          error?.error?.message ?? error?.message ?? 'No se pudo completar el registro.';
        this.notification.show(message, 'error');
      },
    });
  }
}
