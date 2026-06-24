import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ADMIN_TIPO_ENVIO_OPTIONS,
  SALE_ORIGIN_OPTIONS,
} from '../../../../core/constants/business-options';
import { Product } from '../../../../models/product.model';
import { Usuario } from '../../../../models/usuario.model';
import { CheckoutRequest, Venta } from '../../../../models/venta.model';
import { ProductService } from '../../../../services/product.services';
import { UsuarioService } from '../../../../services/usuario.services';
import { NotificationService } from '../../../../services/notification';
import { CheckoutService } from '../../../../core/services/checkout.service';

interface SaleItemRow {
  idProducto: string;
  cantidad: number;
  idPromocion: number | null;
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
  private readonly checkoutService = inject(CheckoutService);
  private readonly notification = inject(NotificationService);

  readonly shippingOptions = ADMIN_TIPO_ENVIO_OPTIONS;
  readonly paymentOptions = signal<any[]>([]);

  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly products = signal<Product[]>([]);
  readonly users = signal<Usuario[]>([]);
  readonly employees = signal<any[]>([]);

  readonly items = signal<SaleItemRow[]>([]);
  readonly lastVenta = signal<Venta | null>(null);
  readonly generarEnvio = signal(false); // Por defecto desactivado para ventas presenciales locales
  readonly selectedShippingType = signal<string>('DOMICILIO');
  readonly tax = signal(0.08); // Impuesto de demostración (8%)

  readonly saleForm = this.fb.group({
    idEmpleado: ['', [Validators.required]],
    idCliente: [''], // ID del cliente registrado seleccionado
    nombreCliente: [''], // Datos opcionales de cliente ocasional
    documentoCliente: [''],
    emailCliente: [''],
    observacionesEnvio: [''],
  });

  readonly formaPagoForm = this.fb.group({
    idFormaPago: [1, [Validators.required, Validators.min(1)]],
    montoAbonado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  // Clientes filtrados del listado de usuarios
  readonly clientes = computed(() => {
    return this.users().filter((user) => {
      if (!user.idUsuario) return false;
      const role = typeof user.rol === 'string' ? user.rol.toUpperCase() : '';
      return role === '' || role.includes('CLIENTE');
    });
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

  toggleGenerarEnvio(): void {
    this.generarEnvio.set(!this.generarEnvio());
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
    
    // Auto-completar el monto abonado con el total final
    setTimeout(() => {
      this.formaPagoForm.patchValue({ montoAbonado: Number(this.totalFinal().toFixed(2)) });
    });
  }

  removeItemRow(index: number): void {
    this.items.update((rows) => rows.filter((_, idx) => idx !== index));
    setTimeout(() => {
      this.formaPagoForm.patchValue({ montoAbonado: Number(this.totalFinal().toFixed(2)) });
    });
  }

  increaseItemQty(index: number): void {
    this.items.update((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, cantidad: row.cantidad + 1 } : row)),
    );
    setTimeout(() => {
      this.formaPagoForm.patchValue({ montoAbonado: Number(this.totalFinal().toFixed(2)) });
    });
  }

  decreaseItemQty(index: number): void {
    this.items.update((rows) =>
      rows.map((row, idx) =>
        idx === index && row.cantidad > 1 ? { ...row, cantidad: row.cantidad - 1 } : row,
      ),
    );
    setTimeout(() => {
      this.formaPagoForm.patchValue({ montoAbonado: Number(this.totalFinal().toFixed(2)) });
    });
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

  getEmployeeLabel(employee: any): string {
    if (employee.nombreCompleto) return employee.nombreCompleto;
    return `${employee.nombre ?? ''} ${employee.apellido ?? ''}`.trim() || employee.idEmpleado;
  }

  getClienteLabel(cliente: Usuario): string {
    const fullName = `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();
    if (fullName) {
      return `${fullName} (${cliente.email})`;
    }
    return cliente.email;
  }

  procesarPago(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      this.notification.show('Selecciona el empleado que registra la venta.', 'info');
      return;
    }

    if (this.formaPagoForm.invalid) {
      this.formaPagoForm.markAllAsTouched();
      this.notification.show('Completa los datos de pago.', 'info');
      return;
    }

    if (this.items().length === 0) {
      this.notification.show('Agrega al menos un producto al carrito.', 'info');
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

    // Crear DTO alineado con el Backend
    const payload: CheckoutRequest = {
      origenVenta: 'LOCAL',
      idEmpleado: String(saleRaw.idEmpleado),
      idCliente: saleRaw.idCliente ? String(saleRaw.idCliente) : undefined,
      items: itemsValidos,
      pagos: [
        {
          idFormaPago: Number(pagoRaw.idFormaPago),
          montoAbonado: Number(pagoRaw.montoAbonado),
        },
      ],
      generarEnvio: this.generarEnvio(),
      tipoEnvio: this.generarEnvio() ? (this.selectedShippingType() as any) : undefined,
      observacionesEnvio: this.generarEnvio() ? (saleRaw.observacionesEnvio || undefined) : undefined,
    };

    this.submitting.set(true);
    this.checkoutService.checkout(payload).subscribe({
      next: (venta) => {
        this.submitting.set(false);
        this.lastVenta.set(venta);
        this.notification.show(
          `Venta ${venta.idVenta.slice(0, 8).toUpperCase()} registrada con éxito.`,
          'success',
        );
        this.resetForm();
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message || 'No se pudo registrar la venta.';
        this.notification.show(message, 'error');
      },
    });
  }

  private resetForm(): void {
    this.items.set([]);
    this.saleForm.reset({
      idEmpleado: this.saleForm.value.idEmpleado, // Conservamos el empleado
      idCliente: '',
      nombreCliente: '',
      documentoCliente: '',
      emailCliente: '',
      observacionesEnvio: '',
    });
    this.formaPagoForm.reset({ 
      idFormaPago: this.paymentOptions()[0]?.idFormaPago || 1, 
      montoAbonado: null 
    });
    this.generarEnvio.set(false);
    this.selectedShippingType.set('DOMICILIO');
  }

  private loadInitialData(): void {
    this.loading.set(true);

    // Cargar productos
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products.filter((product) => !!product.idProducto && product.activo));
      },
      error: () => {
        this.products.set([]);
        this.notification.show('No se pudieron cargar los productos.', 'error');
      },
    });

    // Cargar usuarios / clientes
    this.usuarioService.getUsuarios().subscribe({
      next: (users) => {
        this.users.set(users.filter((user) => !!user.idUsuario));
      },
      error: () => {
        this.users.set([]);
        this.notification.show('No se pudieron cargar los clientes.', 'error');
      },
    });

    // Cargar formas de pago reales
    this.checkoutService.getFormasPago().subscribe({
      next: (formas) => {
        this.paymentOptions.set(formas);
        if (formas.length > 0) {
          this.formaPagoForm.patchValue({ idFormaPago: formas[0].idFormaPago });
        }
      },
      error: () => {
        this.paymentOptions.set([
          { idFormaPago: 1, nombrePago: 'Efectivo' },
          { idFormaPago: 2, nombrePago: 'Tarjeta débito' },
          { idFormaPago: 3, nombrePago: 'Tarjeta crédito' },
          { idFormaPago: 4, nombrePago: 'Transferencia' },
        ]);
      }
    });

    // Cargar empleados elegibles para la venta (endpoint específico de ventas)
    this.checkoutService.getEmpleadosVenta().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        if (employees.length > 0) {
          this.saleForm.patchValue({ idEmpleado: employees[0].idEmpleado });
        }
        this.loading.set(false);
      },
      error: () => {
        this.employees.set([]);
        this.loading.set(false);
        this.notification.show('No se pudieron cargar los empleados de venta.', 'error');
      },
    });
  }
}
