import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ADMIN_TIPO_ENVIO_OPTIONS,
  FORMA_PAGO_OPTIONS,
  SALE_ORIGIN_OPTIONS,
  SaleOriginOption,
} from '../../../../core/constants/business-options';
import { Product } from '../../../../models/product.model';
import { Usuario } from '../../../../models/usuario.model';
import { CheckoutRequest, Venta } from '../../../../models/venta.model';
import { ProductService } from '../../../../services/product.services';
import { UsuarioService } from '../../../../services/usuario.services';
import { InventarioService } from '../../../../services/inventario.service';
import { NotificationService } from '../../../../services/notification';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { EmpleadoInventario } from '../../../../models/inventario.model';

interface SaleItemRow {
  idProducto: string;
  cantidad: number;
  idPromocion: number | null;
}

interface SalePaymentRow {
  idFormaPago: number;
  montoAbonado: number;
}

@Component({
  selector: 'app-admin-sale-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-sale.page.html',
  styleUrl: './admin-sale.page.css',
})
export class AdminSalePage {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly inventarioService = inject(InventarioService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly notification = inject(NotificationService);

  readonly saleOriginOptions = SALE_ORIGIN_OPTIONS;
  readonly shippingOptions = ADMIN_TIPO_ENVIO_OPTIONS;
  readonly paymentOptions = FORMA_PAGO_OPTIONS;

  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly products = signal<Product[]>([]);
  readonly users = signal<Usuario[]>([]);
  readonly employees = signal<EmpleadoInventario[]>([]);

  readonly items = signal<SaleItemRow[]>([]);
  readonly lastVenta = signal<Venta | null>(null);
  readonly selectedShippingType = signal<string>('DOMICILIO');
  readonly tax = signal(0.08);

  readonly saleForm = this.fb.group({
    idEmpleado: ['', [Validators.required]],
    nombreCliente: [''],
    documentoCliente: [''],
    emailCliente: [''],
  });

  readonly formaPagoForm = this.fb.group({
    idFormaPago: [1, [Validators.required, Validators.min(1)]],
    montoAbonado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly clientes = computed(() => {
    const candidates = this.users().filter((user) => {
      if (!user.idUsuario) {
        return false;
      }
      const role = typeof user.rol === 'string' ? user.rol.toUpperCase() : '';
      return role === '' || role.includes('CLIENTE');
    });

    return candidates.length > 0 ? candidates : this.users().filter((user) => !!user.idUsuario);
  });

  readonly subtotal = computed(() =>
    this.items().reduce((sum, row) => {
      const product = this.products().find((item) => item.idProducto === row.idProducto);
      const precio = Number(product?.precioActual ?? 0);
      const cantidad = Number(row.cantidad ?? 0);
      return sum + precio * cantidad;
    }, 0),
  );

  readonly taxAmount = computed(() => this.subtotal() * this.tax());
  readonly totalFinal = computed(() => this.subtotal() + this.taxAmount());

  constructor() {
    this.loadInitialData();
  }

  selectShippingType(tipo: string): void {
    this.selectedShippingType.set(tipo);
  }

  addProductToCart(idProducto: string): void {
    if (!idProducto) return;

    this.items.update((rows) => {
      const existing = rows.find((row) => row.idProducto === idProducto);
      if (existing) {
        return rows.map((row) =>
          row.idProducto === idProducto ? { ...row, cantidad: row.cantidad + 1 } : row,
        );
      }

      return [...rows, { idProducto, cantidad: 1, idPromocion: null }];
    });
  }

  removeItemRow(index: number): void {
    this.items.update((rows) => rows.filter((_, idx) => idx !== index));
  }

  increaseItemQty(index: number): void {
    this.items.update((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, cantidad: row.cantidad + 1 } : row)),
    );
  }

  decreaseItemQty(index: number): void {
    this.items.update((rows) =>
      rows.map((row, idx) =>
        idx === index && row.cantidad > 1 ? { ...row, cantidad: row.cantidad - 1 } : row,
      ),
    );
  }

  getProductName(idProducto: string): string {
    return this.products().find((p) => p.idProducto === idProducto)?.nombreProducto ?? '';
  }

  getProductPrice(idProducto: string): number {
    return Number(this.products().find((p) => p.idProducto === idProducto)?.precioActual ?? 0);
  }

  getProductCode(idProducto: string): string {
    return this.products().find((p) => p.idProducto === idProducto)?.codigoBarras ?? '';
  }

  getEmployeeLabel(employee: EmpleadoInventario): string {
    const fullName = employee.nombreCompleto?.trim();
    if (fullName) {
      return fullName;
    }

    const shortName = `${employee.nombre ?? ''} ${employee.apellido ?? ''}`.trim();
    if (shortName) {
      return shortName;
    }

    if (employee.email) {
      return employee.email;
    }

    return employee.idEmpleado;
  }

  getClienteLabel(cliente: Usuario): string {
    const fullName = `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();
    if (fullName) {
      return `${fullName} · ${cliente.email}`;
    }
    return cliente.email;
  }

  procesarPago(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      this.notification.show('Selecciona un empleado.', 'info');
      return;
    }

    if (this.formaPagoForm.invalid) {
      this.formaPagoForm.markAllAsTouched();
      this.notification.show('Completa los datos de pago.', 'info');
      return;
    }

    if (this.items().length === 0) {
      this.notification.show('Agrega al menos un producto.', 'info');
      return;
    }

    const itemsValidos = this.items()
      .filter((row) => row.idProducto && Number(row.cantidad) > 0)
      .map((row) => ({
        idProducto: row.idProducto,
        cantidad: Number(row.cantidad),
        idPromocion: row.idPromocion,
      }));

    const saleRaw = this.saleForm.getRawValue();
    const pagoRaw = this.formaPagoForm.getRawValue();

    const payload: CheckoutRequest = {
      origenVenta: 'LOCAL',
      idEmpleado: String(saleRaw.idEmpleado),
      items: itemsValidos,
      pagos: [
        {
          idFormaPago: Number(pagoRaw.idFormaPago),
          montoAbonado: Number(pagoRaw.montoAbonado),
        },
      ],
      generarEnvio: true,
      tipoEnvio: this.selectedShippingType() as any,
    };

    this.submitting.set(true);
    this.checkoutService.checkout(payload).subscribe({
      next: (venta) => {
        this.submitting.set(false);
        this.lastVenta.set(venta);
        this.notification.show(
          `Venta ${venta.idVenta.slice(0, 8)} registrada con éxito.`,
          'success',
        );
        this.resetForm();
      },
      error: () => {
        this.submitting.set(false);
        this.notification.show('No se pudo registrar la venta.', 'error');
      },
    });
  }

  private resetForm(): void {
    this.items.set([]);
    this.saleForm.reset();
    this.formaPagoForm.reset({ idFormaPago: 1, montoAbonado: null });
    this.selectedShippingType.set('DOMICILIO');
  }

  private loadInitialData(): void {
    this.loading.set(true);

    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products.filter((product) => !!product.idProducto));
      },
      error: () => {
        this.products.set([]);
        this.notification.show('No se pudieron cargar los productos.', 'error');
      },
    });

    this.usuarioService.getUsuarios().subscribe({
      next: (users) => {
        this.users.set(users.filter((user) => !!user.idUsuario));
      },
      error: () => {
        this.users.set([]);
        this.notification.show('No se pudieron cargar los clientes.', 'error');
      },
    });

    this.inventarioService.getEmpleados().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.loading.set(false);
      },
      error: () => {
        this.employees.set([]);
        this.loading.set(false);
        this.notification.show('No se pudieron cargar los empleados.', 'error');
      },
    });
  }
}
