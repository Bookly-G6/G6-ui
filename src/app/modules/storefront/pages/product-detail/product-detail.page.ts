import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { CartService } from '../../../../core/services/cart.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-storefront-product-detail-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.page.html',
  styleUrl: './product-detail.page.css',
})
export class ProductDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cart = inject(CartService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(true);
  readonly product = signal<Product | null>(null);

  readonly productCategories = computed(() => {
    const product = this.product();
    if (!product) {
      return [] as string[];
    }

    return product.categorias?.length ? product.categorias : [product.tipoProducto ?? 'General'];
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        switchMap((id) => {
          this.loading.set(true);
          if (!id) {
            throw new Error('ID de producto no válido.');
          }
          return this.productService.getStorefrontProductById(id);
        }),
      )
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.loading.set(false);
        },
        error: () => {
          this.product.set(null);
          this.loading.set(false);
          this.notification.show('No se pudo cargar el detalle del producto.', 'error');
        },
      });
  }

  addToCart(): void {
    const product = this.product();
    if (!product) {
      return;
    }

    this.cart.add(product);
    this.cart.open();
    this.notification.show(`Se agregó ${product.nombreProducto} al carrito.`, 'success');
  }
}
