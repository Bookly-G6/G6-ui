import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { CatalogStateService } from '../../core/services/catalog-state.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-main-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-shell.component.html',
  styleUrl: './main-shell.component.css',
  animations: [
    trigger('drawer', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('260ms ease', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('220ms ease', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class MainShellComponent {
  private readonly router = inject(Router);
  readonly authSession = inject(AuthSessionService);
  readonly catalogState = inject(CatalogStateService);
  readonly cart = inject(CartService);

  readonly isAdmin = computed(() => this.authSession.role() === 'admin');
  readonly isCliente = computed(() => this.authSession.role() === 'cliente');

  constructor() {
    effect(() => {
      if (this.authSession.isAuthenticated() && this.authSession.role() === 'cliente') {
        this.cart.getCart().subscribe({
          error: () => {
            console.warn('Failed to load cart on init');
          },
        });
      }
    });
  }

  onSearchInput(value: string): void {
    this.catalogState.setSearchTerm(value);
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  goToCheckout(): void {
    this.cart.close();
    this.router.navigateByUrl('/checkout');
  }

  logout(): void {
    this.authSession.logout();
    this.cart.clear();
    this.router.navigateByUrl('/');
  }
}
