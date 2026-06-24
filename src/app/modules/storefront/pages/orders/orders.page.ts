import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { LogisticaService } from '../../../../services/logistica.service';
import { NotificationService } from '../../../../services/notification';
import { Venta } from '../../../../models/venta.model';
import { Logistica } from '../../../../models/logistica.model';
import { LOGISTICA_ESTADO_OPTIONS } from '../../../../core/constants/business-options';

const [EN_PREPARACION, LISTO_PARA_RETIRO, DESPACHADO, EN_CAMINO, ENTREGADO] =
  LOGISTICA_ESTADO_OPTIONS;

@Component({
  selector: 'app-orders-page',
  imports: [CommonModule],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.css',
})
export class OrdersPage {
  private readonly checkoutService = inject(CheckoutService);
  private readonly logisticaService = inject(LogisticaService);
  private readonly notification = inject(NotificationService);
  
  readonly orders = signal<Venta[]>([]);
  readonly shippingsMap = signal<Record<string, Logistica>>({});
  readonly loading = signal(true);

  readonly normalizedOrders = computed(() =>
    this.orders().map((order) => ({
      ...order,
      estadoActual: (order.estadoVenta ?? 'CONFIRMADA').toUpperCase(),
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
        
        // Cargar los envíos asociados de forma asíncrona
        orders.forEach((order) => {
          if (order.idEnvio || order.tipoEnvio) {
            this.logisticaService.getLogisticaByVenta(order.idVenta).subscribe({
              next: (shipping) => {
                if (shipping) {
                  this.shippingsMap.update((prev) => ({
                    ...prev,
                    [order.idVenta]: shipping,
                  }));
                }
              },
              error: () => {
                // Fallback silencioso con datos básicos de la orden si el endpoint falla
                this.shippingsMap.update((prev) => ({
                  ...prev,
                  [order.idVenta]: {
                    idVenta: order.idVenta,
                    tipoEnvio: order.tipoEnvio as any,
                    estadoLogistica: order.estadoVenta || EN_PREPARACION,
                  },
                }));
              },
            });
          }
        });
      },
      error: (err) => {
        this.notification.show('No fue posible cargar tus órdenes.', 'error');
        this.orders.set([]);
        this.loading.set(false);
      },
    });
  }

  getStepClass(order: Venta, step: string): string {
    const shipping = this.shippingsMap()[order.idVenta];
    const status = (shipping?.estadoLogistica ?? shipping?.estado ?? order.estadoVenta ?? '').toUpperCase();
    
    const rank = this.getRank(status);
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
      case 'PENDIENTE':
      case EN_PREPARACION:
        return 1;
      case LISTO_PARA_RETIRO:
      case DESPACHADO:
      case EN_CAMINO:
      case 'EN_CAMINO':
        return 2;
      case ENTREGADO:
        return 3;
      default:
        return 1;
    }
  }
}
