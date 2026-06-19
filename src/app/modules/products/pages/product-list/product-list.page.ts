import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { ProductFormComponent } from '../../components/product-form/product-form.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductFormComponent, ConfirmDialogComponent],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.css',
})
export class ProductListPage implements OnInit {
  products: Product[] = [];
  isModalOpen = false;
  selectedProduct: Product | null = null;
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

  requestDeleteProduct(id: string | undefined): void {
    if (!id) {
      this.notification.show('No se encontró el producto para eliminar.', 'info');
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
        this.products = this.products.filter(
          (product) => product.idProducto !== idToDelete,
        );
        this.cdr.detectChanges();
        this.loadProducts();
      },
      error: () => {
        this.notification.show('No se pudo eliminar el producto.', 'error');
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
