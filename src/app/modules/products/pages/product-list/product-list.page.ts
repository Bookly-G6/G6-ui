import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { ProductDetailComponent } from '../../components/product-detail/product-detail.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductFormComponent, ProductDetailComponent, ConfirmDialogComponent],
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
