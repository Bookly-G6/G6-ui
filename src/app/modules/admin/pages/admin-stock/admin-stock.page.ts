import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProductService } from '../../../../services/product.services';
import { InventarioService } from '../../../../services/inventario.service';
import { NotificationService } from '../../../../services/notification';
import { Product } from '../../../../models/product.model';
import {
  EmpleadoInventario,
  InventarioItem,
  InventarioMovimiento,
} from '../../../../models/inventario.model';
import {
  STOCK_MOVIMIENTO_OPTIONS,
  StockMovimientoOption,
} from '../../../../core/constants/business-options';

@Component({
  selector: 'app-admin-stock-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-stock.page.html',
  styleUrl: './admin-stock.page.css',
})
export class AdminStockPage {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly inventarioService = inject(InventarioService);
  private readonly notification = inject(NotificationService);

  readonly products = signal<Product[]>([]);
  readonly employees = signal<EmpleadoInventario[]>([]);
  readonly inventario = signal<InventarioItem[]>([]);
  readonly movimientos = signal<InventarioMovimiento[]>([]);

  readonly loading = signal(false);
  readonly loadingMovimientos = signal(false);
  readonly submitting = signal(false);

  readonly movementOptions = STOCK_MOVIMIENTO_OPTIONS;

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  readonly isProductDropdownOpen = signal(false);
  readonly isEmployeeDropdownOpen = signal(false);
  readonly productSearchText = signal('');
  readonly employeeSearchText = signal('');

  readonly inventoryCards = computed(() =>
    this.inventario().map((item) => ({
      idProducto: item.idProducto,
      nombreProducto: item.producto?.nombreProducto ?? `Producto ${item.idProducto.slice(0, 8)}`,
      stock: item.stock,
      tipoProducto: item.producto?.tipoProducto ?? 'General',
      //codigoBarras: item.producto?.codigoBarras ?? 'Sin código',
    })),
  );

  readonly productNameById = computed(() => {
    const map = new Map<string, string>();
    this.products().forEach((product) => {
      if (product.idProducto) {
        map.set(product.idProducto, product.nombreProducto);
      }
    });

    this.inventario().forEach((item) => {
      const productName = item.producto?.nombreProducto;
      if (productName) {
        map.set(item.idProducto, productName);
      }
    });

    return map;
  });

  readonly productBarcodeById = computed(() => {
    const map = new Map<string, string>();
    this.products().forEach((product) => {
      if (product.idProducto) {
        map.set(product.idProducto, product.codigoBarras);
      }
    });

    this.inventario().forEach((item) => {
      const barcode = item.producto?.codigoBarras;
      if (barcode) {
        map.set(item.idProducto, barcode);
      }
    });

    return map;
  });

  readonly employeeNameById = computed(() => {
    const map = new Map<string, string>();
    this.employees().forEach((employee) => {
      map.set(employee.idEmpleado, this.employeeLabel(employee));
    });
    return map;
  });

  readonly movementRows = computed(() =>
    this.movimientos().map((movement) => ({
      ...movement,
      nombreProducto:
        this.productNameById().get(movement.idProducto) ??
        `Producto ${movement.idProducto.slice(0, 8)}`,
      codigoBarras:
        this.productBarcodeById().get(movement.idProducto) ??
        '--',
      nombreEmpleado:
        this.employeeNameById().get(movement.idEmpleado) ??
        `Empleado ${movement.idEmpleado.slice(0, 8)}`,
    })),
  );

  readonly filteredProductsSearch = computed(() => {
    const term = this.productSearchText().toLowerCase().trim();
    const allProducts = this.products();
    if (!term) {
      return allProducts;
    }
    return allProducts.filter((product) =>
      product.nombreProducto.toLowerCase().includes(term) ||
      product.codigoBarras.toLowerCase().includes(term)
    );
  });

  readonly filteredEmployeesSearch = computed(() => {
    const term = this.employeeSearchText().toLowerCase().trim();
    const allEmployees = this.employees();
    if (!term) {
      return allEmployees;
    }
    return allEmployees.filter((employee) =>
      this.employeeLabel(employee).toLowerCase().includes(term) ||
      this.employeeRole(employee).toLowerCase().includes(term) ||
      (employee.email && employee.email.toLowerCase().includes(term))
    );
  });

  get filteredMovementRows(): Array<
    InventarioMovimiento & { nombreProducto: string; nombreEmpleado: string; codigoBarras: string }
  > {
    const term = this.searchTerm.trim().toLowerCase();
    const rows = this.movementRows();

    if (!term) {
      return rows;
    }

    return rows.filter(
      (movement) =>
        movement.nombreProducto.toLowerCase().includes(term) ||
        movement.codigoBarras.toLowerCase().includes(term) ||
        movement.nombreEmpleado.toLowerCase().includes(term) ||
        movement.tipoMovimiento.toLowerCase().includes(term),
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMovementRows.length / this.pageSize));
  }

  get paginatedMovementRows(): Array<
    InventarioMovimiento & { nombreProducto: string; nombreEmpleado: string; codigoBarras: string }
  > {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredMovementRows.slice(start, start + this.pageSize);
  }

  readonly movementForm = this.fb.group({
    idProducto: ['', [Validators.required]],
    cantidad: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.pattern(/^[1-9]\d*$/)],
    ],
    tipoMovimiento: ['', [Validators.required]],
    idEmpleado: ['', [Validators.required]],
  });

  constructor() {
    this.loadData();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-container-product')) {
      this.isProductDropdownOpen.set(false);
      this.productSearchText.set('');
    }
    if (!target.closest('.custom-select-container-employee')) {
      this.isEmployeeDropdownOpen.set(false);
      this.employeeSearchText.set('');
    }
  }

  selectProduct(productId: string): void {
    this.movementForm.patchValue({ idProducto: productId });
    this.movementForm.get('idProducto')?.markAsTouched();
    this.isProductDropdownOpen.set(false);
    this.productSearchText.set('');
  }

  selectEmployee(employeeId: string): void {
    this.movementForm.patchValue({ idEmpleado: employeeId });
    this.movementForm.get('idEmpleado')?.markAsTouched();
    this.isEmployeeDropdownOpen.set(false);
    this.employeeSearchText.set('');
  }

  getSelectedProductLabel(): string {
    const id = this.movementForm.get('idProducto')?.value;
    if (!id) return 'Selecciona un producto';
    const product = this.products().find((p) => p.idProducto === id);
    return product ? `${product.nombreProducto} (Cód: ${product.codigoBarras})` : 'Selecciona un producto';
  }

  getSelectedEmployeeLabel(): string {
    const id = this.movementForm.get('idEmpleado')?.value;
    if (!id) return 'Selecciona un empleado';
    const employee = this.employees().find((e) => e.idEmpleado === id);
    return employee ? this.employeeLabel(employee) : 'Selecciona un empleado';
  }

  onlyPositiveNumbers(event: KeyboardEvent): boolean {
    const charCode = event.key;
    // Allow only numbers 0-9
    if (charCode < '0' || charCode > '9') {
      event.preventDefault();
      return false;
    }
    return true;
  }

  loadData(): void {
    this.loading.set(true);
    this.loadingMovimientos.set(true);

    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
      },
      error: () => {
        this.products.set([]);
        this.notification.show('No se pudo cargar el listado de productos.', 'error');
      },
    });

    this.inventarioService.getEmpleados().subscribe({
      next: (employees) => {
        this.employees.set(employees);
      },
      error: () => {
        this.employees.set([]);
        this.notification.show('No se pudo cargar el listado de empleados.', 'error');
      },
    });

    this.refreshInventario(() => this.loading.set(false));
    this.refreshMovimientos(() => this.loadingMovimientos.set(false));
  }

  refreshInventario(onFinally?: () => void): void {
    this.inventarioService.getInventario().subscribe({
      next: (items) => {
        this.inventario.set(items);
        onFinally?.();
      },
      error: () => {
        this.inventario.set([]);
        this.notification.show('No se pudo cargar el inventario.', 'error');
        onFinally?.();
      },
    });
  }

  refreshMovimientos(onFinally?: () => void): void {
    this.inventarioService.getMovimientos().subscribe({
      next: (items) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        this.movimientos.set(sorted);
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        onFinally?.();
      },
      error: () => {
        this.movimientos.set([]);
        this.notification.show('No se pudo cargar el historial de movimientos.', 'error');
        onFinally?.();
      },
    });
  }

  employeeLabel(employee: EmpleadoInventario): string {
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

  employeeRole(employee: EmpleadoInventario): string {
    const rol = employee.rol;
    if (!rol) {
      return 'Empleado';
    }
    if (typeof rol === 'string') {
      return rol;
    }
    if (typeof rol === 'object' && 'nombreRol' in rol) {
      return rol.nombreRol;
    }
    return 'Empleado';
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  private readonly exportHeaders = [
    'Fecha',
    'Código de Barra',
    'Producto',
    'Tipo',
    'Cantidad',
    'Empleado',
    'Stock resultante',
  ];

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private getExportRows(): (string | number)[][] {
    return this.filteredMovementRows.map((movement) => [
      this.formatDate(movement.fecha),
      movement.codigoBarras,
      movement.nombreProducto,
      movement.tipoMovimiento,
      movement.cantidad,
      movement.nombreEmpleado,
      movement.stockResultante,
    ]);
  }

  exportPdf(): void {
    const doc = new jsPDF();
    doc.text('Historial de movimientos de inventario', 14, 15);
    autoTable(doc, {
      head: [this.exportHeaders],
      body: this.getExportRows(),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save('historial-movimientos.pdf');
  }

  exportExcel(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    XLSX.writeFile(workbook, 'historial-movimientos.xlsx');
  }

  exportCsv(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'historial-movimientos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  onSubmit(): void {
    if (this.movementForm.invalid) {
      this.movementForm.markAllAsTouched();
      this.notification.show('Completa todos los campos del movimiento de stock.', 'info');
      return;
    }

    const raw = this.movementForm.getRawValue();
    const tipoMovimiento = raw.tipoMovimiento as StockMovimientoOption;
    const payload = {
      idProducto: String(raw.idProducto),
      cantidad: Number(raw.cantidad),
      tipoMovimiento,
      idEmpleado: String(raw.idEmpleado),
    };

    this.submitting.set(true);
    this.inventarioService.registrarMovimiento(payload).subscribe({
      next: () => {
        this.notification.show('Movimiento registrado.');
        this.movementForm.reset({
          idProducto: '',
          cantidad: null,
          tipoMovimiento: '',
          idEmpleado: '',
        });
        let pendingRefreshCalls = 2;
        const done = () => {
          pendingRefreshCalls -= 1;
          if (pendingRefreshCalls === 0) {
            this.submitting.set(false);
          }
        };

        this.refreshInventario(done);
        this.refreshMovimientos(done);
      },
      error: () => {
        this.submitting.set(false);
        this.notification.show('No se pudo registrar el movimiento de inventario.', 'error');
      },
    });
  }
}
