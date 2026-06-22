import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import { CatalogStateService } from '../../../../core/services/catalog-state.service';
import { CartService } from '../../../../core/services/cart.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
  animations: [
    trigger('cardIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('360ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CatalogPage {
  private readonly productService = inject(ProductService);
  private readonly catalogSettings = inject(CatalogSettingsService);
  private readonly router = inject(Router);
  readonly catalogState = inject(CatalogStateService);
  private readonly cartService = inject(CartService);
  private readonly notification = inject(NotificationService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<string[]>(['Todos']);
  readonly loading = signal(true);

  readonly filteredProducts = computed(() => {
    const term = this.catalogState.searchTerm().toLowerCase().trim();
    const category = this.catalogState.selectedCategory();

    return this.products().filter((product) => {
      const haystack = [
        product.nombreProducto,
        product.descripcion,
        product.codigoBarras,
        product.tipoProducto,
        ...(product.autores ?? []),
      ]
        .join(' ')
        .toLowerCase();

      const categories = product.categorias?.length
        ? product.categorias
        : [product.tipoProducto ?? 'General'];
      const categoryMatch = category === 'Todos' || categories.some((item) => item === category);
      const textMatch = !term || haystack.includes(term);

      return textMatch && categoryMatch;
    });
  });

  constructor() {
    this.loadCatalog();
  }

  setCategory(category: string): void {
    this.catalogState.setCategory(category);
  }

  addToCart(product: Product): void {
    this.cartService.add(product);
    this.cartService.open();
    this.notification.show(`Se agregó ${product.nombreProducto} al carrito.`, 'success');
  }

  goToProductDetail(product: Product): void {
    if (!product.idProducto) {
      this.notification.show('No se pudo abrir el detalle del producto.', 'error');
      return;
    }

    this.router.navigate(['/producto', product.idProducto]);
  }

  private loadCatalog(): void {
    this.loading.set(true);

    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.catalogSettings.getCategorias().subscribe({
          next: (categorias) => {
            const fromApi = categorias.map((item) => item.nombreCategoria);
            const fromProducts = products
              .flatMap((item) =>
                item.categorias?.length ? item.categorias : [item.tipoProducto ?? 'General'],
              )
              .filter(Boolean);

            const unique = ['Todos', ...Array.from(new Set([...fromApi, ...fromProducts]))];
            this.categories.set(unique);
            this.loading.set(false);
          },
          error: () => {
            const fallback = [
              'Todos',
              ...Array.from(
                new Set(
                  products
                    .flatMap((item) =>
                      item.categorias?.length ? item.categorias : [item.tipoProducto ?? 'General'],
                    )
                    .filter(Boolean),
                ),
              ),
            ];
            this.categories.set(fallback);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.notification.show('No fue posible cargar el catálogo.', 'error');
      },
    });
  }
}
