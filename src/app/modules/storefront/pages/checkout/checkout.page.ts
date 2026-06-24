import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { NotificationService } from '../../../../services/notification';
import { CheckoutRequest } from '../../../../models/venta.model';
import { TIPO_ENVIO_OPTIONS, TipoEnvioOption } from '../../../../core/constants/business-options';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css',
})
export class CheckoutPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly checkout = inject(CheckoutService);
  private readonly auth = inject(AuthSessionService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly checkoutForm!: FormGroup;
  readonly tipoEnvioOptions = TIPO_ENVIO_OPTIONS;
  readonly formasPago = signal<any[]>([]);

  // Múltiples formas de pago
  readonly pagosAgregados = signal<Array<{ idFormaPago: number; nombrePago: string; montoAbonado: number }>>([]);

  readonly totalAbonado = computed(() =>
    this.pagosAgregados().reduce((sum, p) => sum + p.montoAbonado, 0)
  );

  readonly selectedShippingType = signal<string>('DOMICILIO');

  readonly formaPagoForm = this.fb.group({
    idFormaPago: [1, [Validators.required, Validators.min(1)]],
    montoAbonado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

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
      tipoEnvio: ['DOMICILIO', Validators.required],
      observacionesEnvio: [''],
    });
  }

  ngOnInit(): void {
    this.loadFormasPago();
  }

  private loadFormasPago(): void {
    this.checkout.getFormasPago().subscribe({
      next: (data) => {
        this.formasPago.set(data);
        if (data.length > 0) {
          this.formaPagoForm.patchValue({ idFormaPago: data[0].idFormaPago });
        }
        this.updateRemainingPaymentInput();
      },
      error: () => {
        const fallback = [
          { idFormaPago: 1, nombrePago: 'Efectivo' },
          { idFormaPago: 2, nombrePago: 'Tarjeta débito' },
          { idFormaPago: 3, nombrePago: 'Tarjeta crédito' },
          { idFormaPago: 4, nombrePago: 'Transferencia' },
        ];
        this.formasPago.set(fallback);
        this.formaPagoForm.patchValue({ idFormaPago: fallback[0].idFormaPago });
        this.updateRemainingPaymentInput();
      },
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

    if (this.pagosAgregados().length === 0) {
      this.notification.show('Agrega al menos una forma de pago.', 'error');
      return;
    }

    if (this.totalAbonado() < this.cartTotal()) {
      this.notification.show('El monto total abonado no cubre el total de la compra.', 'error');
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
        this.notification.show('Compra confirmada con éxito.', 'success');
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

  selectShippingType(tipo: string): void {
    this.selectedShippingType.set(tipo);
    this.checkoutForm.patchValue({ tipoEnvio: tipo });
  }

  agregarPago(): void {
    if (this.formaPagoForm.invalid) {
      this.formaPagoForm.markAllAsTouched();
      return;
    }

    const raw = this.formaPagoForm.getRawValue();
    const idFormaPago = Number(raw.idFormaPago);
    const monto = Number(raw.montoAbonado);

    if (monto <= 0) {
      this.notification.show('El monto debe ser mayor a 0.', 'error');
      return;
    }

    const forma = this.formasPago().find((o) => o.idFormaPago === idFormaPago);
    const nombrePago = forma ? (forma.nombrePago || forma.label || forma.nombreRol) : `Método ${idFormaPago}`;

    this.pagosAgregados.update((prev) => [...prev, { idFormaPago, nombrePago, montoAbonado: monto }]);
    
    this.formaPagoForm.get('montoAbonado')?.reset();
    this.formaPagoForm.get('montoAbonado')?.markAsUntouched();
    setTimeout(() => {
      this.updateRemainingPaymentInput();
    });
  }

  eliminarPago(index: number): void {
    this.pagosAgregados.update((prev) => prev.filter((_, idx) => idx !== index));
    setTimeout(() => {
      this.updateRemainingPaymentInput();
    });
  }

  updateRemainingPaymentInput(): void {
    const remaining = Math.max(0, this.cartTotal() - this.totalAbonado());
    this.formaPagoForm.patchValue({ montoAbonado: remaining > 0 ? Number(remaining.toFixed(2)) : null });
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
    const tipoEnvio = this.selectedShippingType() as any;
    const observacionesEnvio = this.selectedShippingType() === 'DOMICILIO'
      ? String(this.checkoutForm.value.observacionesEnvio ?? '').trim()
      : undefined;

    return {
      origenVenta: 'WEB',
      idSucursal,
      items,
      pagos: this.pagosAgregados().map((p) => ({
        idFormaPago: p.idFormaPago,
        montoAbonado: p.montoAbonado,
      })),
      generarEnvio: true,
      tipoEnvio,
      observacionesEnvio: observacionesEnvio || undefined,
    };
  }
}
