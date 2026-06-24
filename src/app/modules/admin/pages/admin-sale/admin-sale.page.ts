import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

  // Buscadores selectivos
  readonly isProductDropdownOpen = signal(false);
  readonly isUserDropdownOpen = signal(false);
  readonly isEmployeeDropdownOpen = signal(false);

  readonly productSearchText = signal('');
  readonly userSearchText = signal('');
  readonly employeeSearchText = signal('');

  readonly saleForm = this.fb.group({
    idEmpleado: ['', [Validators.required]],
    idCliente: [''], // ID del cliente registrado seleccionado
    nombreCliente: [''], // Datos opcionales de cliente ocasional
    documentoCliente: [''],
    emailCliente: ['', [Validators.email]],
    observacionesEnvio: [''],
  });

  readonly formaPagoForm = this.fb.group({
    idFormaPago: [1, [Validators.required, Validators.min(1)]],
    montoAbonado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  // Múltiples formas de pago
  readonly pagosAgregados = signal<Array<{ idFormaPago: number; nombrePago: string; montoAbonado: number }>>([]);

  readonly totalAbonado = computed(() =>
    this.pagosAgregados().reduce((sum, p) => sum + p.montoAbonado, 0)
  );

  // Clientes del listado
  readonly clientes = computed(() => {
    return this.users().filter((user) => !!user.idUsuario);
  });

  readonly subtotal = computed(() =>
    this.items().reduce((sum, row) => {
      const product = this.products().find((item) => item.idProducto === row.idProducto);
      const precio = Number(product?.precioActual ?? 0);
      const cantidad = Number(row.cantidad ?? 0);
      return sum + precio * cantidad;
    }, 0),
  );

  readonly totalFinal = computed(() => this.subtotal());

  // Colecciones filtradas para los buscadores selectivos
  readonly filteredProductsSearch = computed(() => {
    const term = this.productSearchText().toLowerCase().trim();
    const allProducts = this.products().filter((p) => p.stock !== undefined && p.stock > 0);
    if (!term) return allProducts;
    return allProducts.filter(
      (p) =>
        p.nombreProducto.toLowerCase().includes(term) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term))
    );
  });

  readonly filteredUsersSearch = computed(() => {
    const term = this.userSearchText().toLowerCase().trim();
    const allUsers = this.clientes();
    if (!term) return allUsers;
    return allUsers.filter(
      (u) =>
        (u.nombre ?? '').toLowerCase().includes(term) ||
        (u.apellido ?? '').toLowerCase().includes(term)
    );
  });

  readonly filteredEmployeesSearch = computed(() => {
    const term = this.employeeSearchText().toLowerCase().trim();
    const allEmployees = this.employees();
    if (!term) return allEmployees;
    return allEmployees.filter(
      (e) =>
        this.getEmployeeLabel(e).toLowerCase().includes(term) ||
        (e.email && e.email.toLowerCase().includes(term))
    );
  });

  // Historial de Ventas
  readonly ventas = signal<Venta[]>([]);
  searchTermSales = '';
  currentPageSales = 1;
  pageSizeSales = 10;

  readonly filteredVentasRows = computed(() => {
    const term = this.searchTermSales.toLowerCase().trim();
    const rows = this.ventas();
    if (!term) return rows;
    return rows.filter(
      (v) =>
        v.idVenta.toLowerCase().includes(term) ||
        v.estadoVenta.toLowerCase().includes(term) ||
        (v.idCliente && v.idCliente.toLowerCase().includes(term)) ||
        (v.idEmpleado && v.idEmpleado.toLowerCase().includes(term))
    );
  });

  get totalPagesSales(): number {
    return Math.max(1, Math.ceil(this.filteredVentasRows().length / this.pageSizeSales));
  }

  onSearchSalesChange(): void {
    this.currentPageSales = 1;
  }

  readonly paginatedVentasRows = computed(() => {
    const start = (this.currentPageSales - 1) * this.pageSizeSales;
    return this.filteredVentasRows().slice(start, start + this.pageSizeSales);
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-container-product')) {
      this.isProductDropdownOpen.set(false);
      this.productSearchText.set('');
    }
    if (!target.closest('.custom-select-container-user')) {
      this.isUserDropdownOpen.set(false);
      this.userSearchText.set('');
    }
    if (!target.closest('.custom-select-container-employee')) {
      this.isEmployeeDropdownOpen.set(false);
      this.employeeSearchText.set('');
    }
  }

  selectProduct(productId: string): void {
    this.addProductToCart(productId);
    this.isProductDropdownOpen.set(false);
    this.productSearchText.set('');
  }

  selectUser(userId: string): void {
    this.saleForm.patchValue({ idCliente: userId });
    this.saleForm.get('idCliente')?.markAsTouched();
    this.isUserDropdownOpen.set(false);
    this.userSearchText.set('');
  }

  selectEmployee(employeeId: string): void {
    this.saleForm.patchValue({ idEmpleado: employeeId });
    this.saleForm.get('idEmpleado')?.markAsTouched();
    this.isEmployeeDropdownOpen.set(false);
    this.employeeSearchText.set('');
  }

  getSelectedProductLabel(): string {
    return '+ Seleccionar Producto';
  }

  getSelectedUserLabel(): string {
    const id = this.saleForm.get('idCliente')?.value;
    if (!id) return '-- Consumidor Final / Cliente Ocasional --';
    const user = this.users().find((u) => u.idUsuario === id);
    return user ? this.getClienteLabel(user) : '-- Consumidor Final / Cliente Ocasional --';
  }

  getSelectedEmployeeLabel(): string {
    const id = this.saleForm.get('idEmpleado')?.value;
    if (!id) return 'Selecciona un empleado';
    const employee = this.employees().find((e) => e.idEmpleado === id);
    return employee ? this.getEmployeeLabel(employee) : 'Selecciona un empleado';
  }

  constructor() {
    this.loadInitialData();
  }  selectShippingType(tipo: string): void {
    this.selectedShippingType.set(tipo);
  }

  toggleGenerarEnvio(): void {
    this.generarEnvio.set(!this.generarEnvio());
  }

  updateRemainingPaymentInput(): void {
    const remaining = Math.max(0, this.totalFinal() - this.totalAbonado());
    this.formaPagoForm.patchValue({ montoAbonado: remaining > 0 ? Number(remaining.toFixed(2)) : null });
  }

  addProductToCart(idProducto: string): void {
    if (!idProducto) return;

    const product = this.products().find((p) => p.idProducto === idProducto);
    const stockAvailable = product?.stock ?? 0;

    this.items.update((rows) => {
      const existing = rows.find((row) => row.idProducto === idProducto);
      if (existing) {
        if (existing.cantidad >= stockAvailable) {
          this.notification.show(`No hay suficiente stock para ${product?.nombreProducto}. Stock disponible: ${stockAvailable}`, 'error');
          return rows;
        }
        return rows.map((row) =>
          row.idProducto === idProducto ? { ...row, cantidad: row.cantidad + 1 } : row,
        );
      }

      if (stockAvailable <= 0) {
        this.notification.show(`El producto ${product?.nombreProducto} no tiene stock disponible.`, 'error');
        return rows;
      }

      return [...rows, { idProducto, cantidad: 1, idPromocion: null }];
    });
    
    setTimeout(() => {
      this.updateRemainingPaymentInput();
    });
  }

  removeItemRow(index: number): void {
    this.items.update((rows) => rows.filter((_, idx) => idx !== index));
    setTimeout(() => {
      this.updateRemainingPaymentInput();
    });
  }

  increaseItemQty(index: number): void {
    const row = this.items()[index];
    const product = this.products().find((p) => p.idProducto === row.idProducto);
    const stockAvailable = product?.stock ?? 0;

    if (row.cantidad >= stockAvailable) {
      this.notification.show(`No hay suficiente stock para ${product?.nombreProducto}. Stock disponible: ${stockAvailable}`, 'error');
      return;
    }

    this.items.update((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, cantidad: row.cantidad + 1 } : row)),
    );
    setTimeout(() => {
      this.updateRemainingPaymentInput();
    });
  }

  decreaseItemQty(index: number): void {
    this.items.update((rows) =>
      rows.map((row, idx) =>
        idx === index && row.cantidad > 1 ? { ...row, cantidad: row.cantidad - 1 } : row,
      ),
    );
    setTimeout(() => {
      this.updateRemainingPaymentInput();
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
    return fullName || 'Cliente Sin Nombre';
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

    const forma = this.paymentOptions().find((o) => o.idFormaPago === idFormaPago);
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

  procesarPago(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      this.notification.show('Selecciona el empleado que registra la venta.', 'info');
      return;
    }

    if (this.items().length === 0) {
      this.notification.show('Agrega al menos un producto al carrito.', 'info');
      return;
    }

    if (this.pagosAgregados().length === 0) {
      this.notification.show('Agrega al menos una forma de pago.', 'info');
      return;
    }

    if (this.totalAbonado() < this.totalFinal()) {
      this.notification.show('El monto total abonado no cubre el total de la venta.', 'error');
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

    const payload: CheckoutRequest = {
      origenVenta: 'LOCAL',
      idEmpleado: String(saleRaw.idEmpleado),
      idCliente: saleRaw.idCliente ? String(saleRaw.idCliente) : undefined,
      items: itemsValidos,
      pagos: this.pagosAgregados().map((p) => ({
        idFormaPago: p.idFormaPago,
        montoAbonado: p.montoAbonado,
      })),
      generarEnvio: this.generarEnvio(),
      tipoEnvio: this.generarEnvio() ? (this.selectedShippingType() as any) : undefined,
      observacionesEnvio: (this.generarEnvio() && this.selectedShippingType() === 'DOMICILIO') ? (saleRaw.observacionesEnvio || undefined) : undefined,
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
        this.descargarComprobante(venta);
        this.resetForm();
        this.loadVentas();
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
    this.pagosAgregados.set([]);
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
    this.usuarioService.getClientes().subscribe({
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

    this.loadVentas();
  }

  loadVentas(): void {
    this.checkoutService.getVentas().subscribe({
      next: (list) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        this.ventas.set(sorted);
      },
      error: () => {
        this.ventas.set([]);
      }
    });
  }

  goToPageSales(page: number): void {
    if (page < 1 || page > this.totalPagesSales) return;
    this.currentPageSales = page;
  }

  prevPageSales(): void {
    this.goToPageSales(this.currentPageSales - 1);
  }

  nextPageSales(): void {
    this.goToPageSales(this.currentPageSales + 1);
  }

  private readonly salesExportHeaders = [
    'ID Venta',
    'Fecha',
    'Estado',
    'Origen',
    'Subtotal',
    'Total',
    'Abonado',
    'Artículos'
  ];

  private formatSalesDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private getSalesExportRows(): (string | number)[][] {
    return this.filteredVentasRows().map((v) => [
      `VTA-${v.idVenta.slice(0, 8).toUpperCase()}`,
      this.formatSalesDate(v.fecha),
      v.estadoVenta,
      v.origenVenta,
      `$${v.subtotalSinDescuentos.toFixed(2)}`,
      `$${v.totalFinal.toFixed(2)}`,
      `$${v.totalPagado.toFixed(2)}`,
      v.detalles.map((d) => `${d.nombreProducto} x${d.cantidad}`).join(', ')
    ]);
  }

  exportSalesPdf(): void {
    const doc = new jsPDF();
    doc.text('Historial de Ventas - Bookly', 14, 15);
    autoTable(doc, {
      head: [this.salesExportHeaders],
      body: this.getSalesExportRows(),
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save('historial-ventas.pdf');
  }

  exportSalesExcel(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.salesExportHeaders, ...this.getSalesExportRows()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, 'historial-ventas.xlsx');
  }

  exportSalesCsv(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.salesExportHeaders, ...this.getSalesExportRows()]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'historial-ventas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  descargarComprobante(venta: Venta): void {
    const doc = new jsPDF();
    
    // Diseño del comprobante
    doc.setFillColor(30, 58, 138); // Azul corporativo
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('BOOKLY STORE', 15, 20);
    doc.setFontSize(10);
    doc.text('Comprobante de Venta Oficial', 15, 30);
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.text(`Comprobante N°: VTA-${venta.idVenta.toUpperCase()}`, 15, 55);
    doc.text(`Fecha: ${this.formatSalesDate(venta.fecha)}`, 15, 62);
    doc.text(`Origen: ${venta.origenVenta}`, 15, 69);
    
    // Info de Cliente / Empleado
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 75, 195, 75);
    
    doc.setFontSize(10);
    doc.text('Datos de la Operación:', 15, 82);
    
    const clientLabel = venta.idCliente 
      ? `Cliente Registrado (ID: ${venta.idCliente.slice(0, 8)})`
      : 'Consumidor Final / Ocasional';
    doc.text(`Cliente: ${clientLabel}`, 15, 89);
    
    if (venta.idEmpleado) {
      doc.text(`Atendido por Empleado: ${venta.idEmpleado.slice(0, 8).toUpperCase()}`, 15, 96);
    }
    
    // Detalle de productos
    const headers = [['Producto', 'Cant.', 'Precio Unitario', 'Subtotal']];
    const body = venta.detalles.map((d) => [
      d.nombreProducto,
      d.cantidad,
      `$${d.precioUnitario.toFixed(2)}`,
      `$${d.subtotalRenglon.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 105,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9 }
    });
    
    // Totales
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Total de la Compra: $${venta.totalFinal.toFixed(2)}`, 130, finalY + 15);
    doc.text(`Total Abonado: $${venta.totalPagado.toFixed(2)}`, 130, finalY + 22);
    
    const vuelto = venta.totalPagado - venta.totalFinal;
    if (vuelto > 0) {
      doc.text(`Vuelto: $${vuelto.toFixed(2)}`, 130, finalY + 29);
    }
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Gracias por elegir Bookly. Conserve este comprobante.', 15, finalY + 45);
    
    doc.save(`comprobante-${venta.idVenta.slice(0, 8).toUpperCase()}.pdf`);
  }
}
