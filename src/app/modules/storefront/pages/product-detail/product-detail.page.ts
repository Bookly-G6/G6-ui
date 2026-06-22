import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { CartService } from '../../../../core/services/cart.service';
import { NotificationService } from '../../../../services/notification';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

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
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly product = signal<Product | null>(null);

  readonly productCategories = computed(() => {
    const product = this.product();
    if (!product) {
      return [] as string[];
    }

    return product.categorias?.length ? product.categorias : [product.tipoProducto ?? 'General'];
  });

  readonly detailAttributes = computed(() => {
    const attributes = this.product()?.atributosEspecificos ?? {};
    return Object.entries(attributes).map(([key, value]) => ({
      key: this.humanizeKey(key),
      value: this.formatAttributeValue(value),
    }));
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

    if (!this.authSession.isAuthenticated()) {
      this.notification.show('Inicia sesión para agregar productos al carrito.', 'info');
      this.router.navigateByUrl('/ingresar');
      return;
    }

    if (!product.idProducto) {
      this.notification.show('No se pudo agregar el producto.', 'error');
      return;
    }

    this.cart.addItem({ idProducto: product.idProducto, cantidad: 1 }).subscribe({
      next: () => {
        this.cart.open();
        this.notification.show(`Se agregó ${product.nombreProducto} al carrito.`, 'success');
      },
      error: () => {
        this.notification.show('No se pudo agregar el producto al carrito.', 'error');
      },
    });
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (first) => first.toUpperCase());
  }

  private formatAttributeValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);
  }
}
