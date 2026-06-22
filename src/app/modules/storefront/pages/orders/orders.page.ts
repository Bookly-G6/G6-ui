import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutService, OrderDetail } from '../../../../core/services/checkout.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-orders-page',
  imports: [CommonModule],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.css',
})
export class OrdersPage {
  private readonly checkoutService = inject(CheckoutService);
  private readonly notification = inject(NotificationService);
  readonly orders = signal<OrderDetail[]>([]);
  readonly loading = signal(true);

  readonly normalizedOrders = computed(() =>
    this.orders().map((order) => ({
      ...order,
      estadoActual: (order.estado ?? 'CONFIRMADA').toUpperCase(),
    })),
  );

  constructor() {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading.set(true);
    this.checkoutService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        this.notification.show('No fue posible cargar tus órdenes.', 'error');
        this.orders.set([]);
        this.loading.set(false);
      },
    });
  }

  getStepClass(order: { estadoActual: string }, step: string): string {
    const rank = this.getRank(order.estadoActual);
    const current = this.getRank(step);

    if (current < rank) {
      return 'done';
    }

    if (current === rank) {
      return 'current';
    }

    return 'pending';
  }

  private getRank(status: string): number {
    switch (status) {
      case 'EN_PREPARACION':
        return 1;
      case 'LISTO_PARA_RETIRO':
      case 'DESPACHADO':
        return 2;
      case 'EN_CAMINO':
        return 3;
      case 'ENTREGADO':
        return 4;
      default:
        return 1;
    }
  }
}
