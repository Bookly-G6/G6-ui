import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductService } from '../../../../services/product.services';
import { Product } from '../../../../models/product.model';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import { CatalogStateService } from '../../../../core/services/catalog-state.service';
import { CartService } from '../../../../core/services/cart.service';
import { NotificationService } from '../../../../services/notification';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  private readonly authSession = inject(AuthSessionService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<string[]>(['Todos']);
  readonly loading = signal(true);

  // Filtros Avanzados
  readonly selectedTipoProducto = signal<string>('Todos');
  readonly selectedAutor = signal<string>('Todos');
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);

  // Listados de filtros compilados dinámicamente de los productos cargados
  readonly availableTipos = computed(() => {
    const types = this.products()
      .map((p) => p.tipoProducto)
      .filter(Boolean) as string[];
    return ['Todos', ...Array.from(new Set(types))];
  });

  readonly availableAutores = computed(() => {
    const authors = this.products()
      .flatMap((p) => p.autores ?? [])
      .filter(Boolean) as string[];
    return ['Todos', ...Array.from(new Set(authors))];
  });

  readonly filteredProducts = computed(() => {
    const term = this.catalogState.searchTerm().toLowerCase().trim();
    const category = this.catalogState.selectedCategory();
    const tipo = this.selectedTipoProducto();
    const autor = this.selectedAutor();
    const minP = this.minPrice();
    const maxP = this.maxPrice();

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

      const textMatch = !term || haystack.includes(term);

      const categories = product.categorias?.length
        ? product.categorias
        : [product.tipoProducto ?? 'General'];
      const categoryMatch = category === 'Todos' || categories.some((item) => item === category);

      const tipoMatch = tipo === 'Todos' || product.tipoProducto === tipo;

      const autorMatch = autor === 'Todos' || (product.autores ?? []).includes(autor);

      const price = Number(product.precioActual ?? 0);
      const minMatch = minP === null || price >= minP;
      const maxMatch = maxP === null || price <= maxP;

      return textMatch && categoryMatch && tipoMatch && autorMatch && minMatch && maxMatch;
    });
  });

  // Paginación
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8); // 8 es perfecto para una grilla de 4 columnas

  readonly paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize()));
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  canBuy(product: Product): boolean {
    return product.activo && (product.stock ?? 0) > 0;
  }

  constructor() {
    this.loadCatalog();
    
    // Restablecer a la página 1 cuando cambien los filtros o la búsqueda
    effect(() => {
      this.filteredProducts();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  setCategory(category: string): void {
    this.catalogState.setCategory(category);
  }

  addToCart(product: Product): void {
    if (!this.canBuy(product)) {
      this.notification.show('Producto sin stock.');
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

    this.cartService.addItem({ idProducto: product.idProducto, cantidad: 1 }).subscribe({
      next: () => {
        this.cartService.open();
        this.notification.show(`Se agregó ${product.nombreProducto} al carrito.`, 'success');
      },
      error: () => {
        this.notification.show('No se pudo agregar el producto al carrito.', 'error');
      },
    });
  }

  goToProductDetail(product: Product): void {
    if (!product.idProducto) {
      this.notification.show('No se pudo abrir el detalle del producto.', 'error');
      return;
    }

    this.router.navigate(['/producto', product.idProducto]);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  clearFilters(): void {
    this.selectedTipoProducto.set('Todos');
    this.selectedAutor.set('Todos');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.catalogState.setCategory('Todos');
    this.catalogState.setSearchTerm('');
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
