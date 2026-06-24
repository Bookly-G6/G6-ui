import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { ProductDetailComponent } from '../../components/product-detail/product-detail.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../../services/notification';

// librerias de exportación
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductFormComponent,
    ProductDetailComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.css',
})
export class ProductListPage implements OnInit {
  products: Product[] = [];
  isModalOpen = false;
  selectedProduct: Product | null = null;
  isDetailOpen = false;
  selectedProductId: string | null = null;
  isDeleteConfirmOpen = false;
  productToDeleteId: string | null = null;

  // busqueda y paginación
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;

  constructor(
    private productService: ProductService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar los productos.', 'error');
      },
    });
  }

  // lista filtrada por el buscador
  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.products;
    return this.products.filter(
      (p) =>
        (p.nombreProducto ?? '').toLowerCase().includes(term) ||
        (p.codigoBarras ?? '').toLowerCase().includes(term) ||
        (p.descripcion ?? '').toLowerCase().includes(term),
    );
  }

  // total de paginas segun el filtrado
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  // solo producttos de la pagina actual
  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  // volver a la pagina 1 si se cambia el termino de busqueda
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

  // datos planos para exportar (usa el filtrado, no la página)
  private getExportRows(): (string | number)[][] {
    return this.filteredProducts.map((p) => [
      p.codigoBarras ?? '',
      p.nombreProducto ?? '',
      p.descripcion ?? 'Sin descripción',
      p.precioCosto ?? 0,
      p.precioActual ?? 0,
      p.stock ?? 0,
      p.activo ? 'Activo' : 'Inactivo',
    ]);
  }

  private readonly exportHeaders = [
    'Código de Barras',
    'Nombre / Título',
    'Descripción',
    'Precio Costo',
    'Precio Venta',
    'Stock',
    'Estado',
  ];

  //  exportar a PDF
  exportPdf(): void {
    const doc = new jsPDF();
    doc.text('Listado de productos', 14, 15);
    autoTable(doc, {
      head: [this.exportHeaders],
      body: this.getExportRows(),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save('productos.pdf');
  }

  // exportar en excel
  exportExcel(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'productos.xlsx');
  }

  // exportar a csv
  exportCsv(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.exportHeaders, ...this.getExportRows()]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'productos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  openModal(product: Product | null = null): void {
    this.selectedProduct = product;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedProduct = null;
    this.cdr.detectChanges();
  }

  openDetail(product: Product): void {
    this.selectedProductId = product.idProducto ?? null;
    this.isDetailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedProductId = null;
  }

  requestDeleteProduct(id: string | undefined): void {
    if (!id) {
      this.notification.show('No se encontró el producto para dar de baja.', 'info');
      return;
    }

    this.productToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.productToDeleteId) return;

    const idToDelete = this.productToDeleteId;

    this.productService.deleteProduct(idToDelete).subscribe({
      next: () => {
        this.notification.show('Producto eliminado correctamente.', 'success');
        this.isDeleteConfirmOpen = false;
        this.productToDeleteId = null;
        this.products = this.products.filter((product) => product.idProducto !== idToDelete);
        this.cdr.detectChanges();
        this.loadProducts();
      },
      error: () => {
        this.notification.show('No se pudo dar de baja el producto.', 'error');
        this.isDeleteConfirmOpen = false;
        this.productToDeleteId = null;
      },
    });
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.productToDeleteId = null;
  }
}
