import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { NotificationService } from '../../../../services/notification';
import { CheckoutRequest } from '../../../../models/venta.model';

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
      idSucursal: [1, [Validators.required, Validators.min(1)]],
      idFormaPago: [1, [Validators.required, Validators.min(1)]],
      tipoEnvio: ['DOMICILIO', Validators.required],
      observacionesEnvio: [''],
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

    const payload = this.buildCheckoutRequest();
    if (!payload) {
      this.notification.show('No se pudo preparar el checkout con los datos actuales.', 'error');
      return;
    }

    this.loading.set(true);

    this.checkout.checkout(payload).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.notification.show(
          `Compra confirmada. Venta ${response.idVenta.slice(0, 8)}${response.idEnvio ? ` · Envío ${response.idEnvio.slice(0, 8)}` : ''}`,
          'success',
        );
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

  increaseItem(itemId: string, currentQty: number): void {
    this.cart.updateItem(itemId, { cantidad: currentQty + 1 }).subscribe({
      error: () => {
        this.notification.show('No fue posible actualizar el carrito.', 'error');
      },
    });
  }

  decreaseItem(itemId: string, currentQty: number): void {
    if (currentQty <= 1) {
      this.removeItem(itemId);
      return;
    }

    this.cart.updateItem(itemId, { cantidad: currentQty - 1 }).subscribe({
      error: () => {
        this.notification.show('No fue posible actualizar el carrito.', 'error');
      },
    });
  }

  removeItem(itemId: string): void {
    this.cart.removeItem(itemId).subscribe({
      error: () => {
        this.notification.show('No fue posible eliminar el item.', 'error');
      },
    });
  }

  private buildCheckoutRequest(): CheckoutRequest | null {
    const rawItems = this.cartItems();
    const items = rawItems
      .filter((item) => !!item.idProducto)
      .map((item) => ({
        idProducto: item.idProducto,
        cantidad: item.cantidad,
        idPromocion: null,
      }));

    if (items.length === 0) {
      return null;
    }

    const idSucursal = Number(this.checkoutForm.value.idSucursal ?? 1);
    const idFormaPago = Number(this.checkoutForm.value.idFormaPago ?? 1);
    const tipoEnvio = String(this.checkoutForm.value.tipoEnvio ?? '').trim();
    const observacionesEnvio = String(this.checkoutForm.value.observacionesEnvio ?? '').trim();

    return {
      origenVenta: 'WEB',
      idSucursal,
      items,
      pagos: [
        {
          idFormaPago,
          montoAbonado: this.cartTotal(),
        },
      ],
      generarEnvio: true,
      tipoEnvio,
      observacionesEnvio: observacionesEnvio || undefined,
    };
  }
}
