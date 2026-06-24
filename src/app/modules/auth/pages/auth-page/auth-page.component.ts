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
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    dni: ['', [Validators.pattern(/^\d{7,8}$/)]],

    telefono: ['', [Validators.pattern(/^\d{8,15}$/)]],
  });

  hasLoginError(field: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[field];
    return control.invalid && control.touched;
  }

  hasRegisterError(
    field: 'nombre' | 'apellido' | 'email' | 'password' | 'dni' | 'telefono',
  ): boolean {
    const control = this.registerForm.controls[field];
    return control.invalid && control.touched;
  }

  shouldDisableLoginSubmit(): boolean {
    if (this.loading()) return true;

    const hasTouchedField = Object.values(this.loginForm.controls).some(
      (control) => control.touched,
    );
    return hasTouchedField && this.loginForm.invalid;
  }

  shouldDisableRegisterSubmit(): boolean {
    if (this.loading()) return true;

    const hasTouchedField = Object.values(this.registerForm.controls).some(
      (control) => control.touched,
    );
    return hasTouchedField && this.registerForm.invalid;
  }

  getLoginErrorMessage(field: 'email' | 'password'): string {
    const control = this.loginForm.controls[field];
    if (!control.errors) return '';

    if (control.errors['required']) {
      return field === 'email' ? 'Correo obligatorio.' : 'Contraseña obligatoria.';
    }

    if (control.errors['email']) {
      return 'Correo inválido.';
    }

    if (control.errors['minlength']) {
      return 'Mínimo 6 caracteres.';
    }

    return 'Valor inválido.';
  }

  getRegisterErrorMessage(
    field: 'nombre' | 'apellido' | 'email' | 'password' | 'dni' | 'telefono',
  ): string {
    const control = this.registerForm.controls[field];
    if (!control.errors) return '';

    if (control.errors['required']) {
      switch (field) {
        case 'nombre':
          return 'Nombre obligatorio.';
        case 'apellido':
          return 'Apellido obligatorio.';
        case 'email':
          return 'Correo obligatorio.';
        case 'password':
          return 'Contraseña obligatoria.';
      }
    }

    if (control.errors['email']) {
      return 'Correo inválido.';
    }

    if (control.errors['minlength']) {
      if (field === 'password') return 'Mínimo 6 caracteres.';
      if (field === 'nombre' || field === 'apellido') {
        return 'Mínimo 2 caracteres.';
      }
    }

    if (control.errors['maxlength']) {
      return 'Máximo 50 caracteres.';
    }

    if (control.errors['pattern']) {
      if (field === 'dni') return 'DNI inválido (7-8 dígitos).';
      if (field === 'telefono') return 'Teléfono inválido (8-15 dígitos).';
    }

    return 'Valor inválido.';
  }

  toggleMode(): void {
    this.isRegister.update((value) => !value);
    this.showLoginPassword.set(false);
    this.showRegisterPassword.set(false);
  }

  togglePasswordVisibility(form: 'login' | 'register'): void {
    if (form === 'login') {
      this.showLoginPassword.update((value) => !value);
      return;
    }
    this.showRegisterPassword.update((value) => !value);
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
