import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LogisticaService } from '../../../../services/logistica.service';
import { Logistica } from '../../../../models/logistica.model';

@Component({
  selector: 'app-admin-orders-page',
  imports: [CommonModule],
  templateUrl: './admin-orders.page.html',
  styleUrl: './admin-orders.page.css',
})
export class AdminOrdersPage {
  private readonly logisticaService = inject(LogisticaService);
  readonly allOrders = signal<Logistica[]>([]);

  readonly pendientes = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === 'EN_PREPARACION' || status === 'LISTO_PARA_RETIRO';
    }),
  );

  readonly embalaje = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === 'DESPACHADO' || status === 'EN_CAMINO';
    }),
  );

  readonly shipped = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === 'ENTREGADO';
    }),
  );

  constructor() {
    this.logisticaService.getLogistica().subscribe({
      next: (orders) => this.allOrders.set(orders),
      error: () => this.allOrders.set([]),
    });
  }
}
