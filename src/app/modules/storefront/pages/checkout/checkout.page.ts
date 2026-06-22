import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css',
})
export class CheckoutPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly checkout = inject(CheckoutService);
  private readonly auth = inject(AuthSessionService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly checkoutForm!: FormGroup;

  readonly cartTotal = computed(() =>
    this.cart.items().reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0),
  );

  readonly cartItems = computed(() => this.cart.items());

  constructor() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigateByUrl('/ingresar');
      return;
    }

    this.checkoutForm = this.fb.group({
      direccionEnvio: ['', [Validators.required, Validators.minLength(5)]],
      numeroTelefono: ['', Validators.required],
      observaciones: [''],
    });
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.notification.show('Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    if (this.cartItems().length === 0) {
      this.notification.show(
        'Tu carrito está vacío. Agrega productos antes de continuar.',
        'error',
      );
      return;
    }

    this.loading.set(true);

    this.checkout.checkout(this.checkoutForm.value).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.notification.show(`¡Compra confirmada! ID de venta: ${response.idVenta}`, 'success');
        this.cart.clear();
        this.router.navigateByUrl('/mis-ordenes');
      },
      error: (err) => {
        this.loading.set(false);
        const message =
          err?.error?.message || 'Hubo un error al procesar tu compra. Intenta nuevamente.';
        this.notification.show(message, 'error');
      },
    });
  }

  onCancel(): void {
    this.router.navigateByUrl('/');
  }
}
