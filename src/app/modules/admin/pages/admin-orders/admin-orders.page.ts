import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { LogisticaService } from '../../../../services/logistica.service';
import { Logistica } from '../../../../models/logistica.model';
import { LOGISTICA_ESTADO_OPTIONS } from '../../../../core/constants/business-options';

const [EN_PREPARACION, LISTO_PARA_RETIRO, DESPACHADO, EN_CAMINO, ENTREGADO] =
  LOGISTICA_ESTADO_OPTIONS;

@Component({
  selector: 'app-admin-orders-page',
  imports: [CommonModule],
  templateUrl: './admin-orders.page.html',
  styleUrl: './admin-orders.page.css',
})
export class AdminOrdersPage {
  private readonly logisticaService = inject(LogisticaService);
  readonly allOrders = signal<Logistica[]>([]);
  readonly loading = signal(true);

  readonly pendientes = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === EN_PREPARACION || status === LISTO_PARA_RETIRO;
    }),
  );

  readonly embalaje = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === DESPACHADO || status === EN_CAMINO;
    }),
  );

  readonly shipped = computed(() =>
    this.allOrders().filter((order) => {
      const status = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();
      return status === ENTREGADO;
    }),
  );

  constructor() {
    this.loadLogistica();
  }

  private loadLogistica(): void {
    this.loading.set(true);
    this.logisticaService.getLogistica().subscribe({
      next: (orders) => {
        this.allOrders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.allOrders.set([]);
        this.loading.set(false);
      },
    });
  }

  // Ejecuta la actualización parcial en base al DTO de tu API
  avanzarEstado(order: Logistica): void {
    if (!order.idEnvio) return;

    let nuevoEstado = '';
    let datosExtra = {};

    const estadoActual = (order.estado ?? order.estadoLogistica ?? '').toUpperCase();

    if (estadoActual === EN_PREPARACION || estadoActual === LISTO_PARA_RETIRO) {
      nuevoEstado = DESPACHADO;
    } else if (estadoActual === DESPACHADO || estadoActual === EN_CAMINO) {
      nuevoEstado = ENTREGADO;
      datosExtra = { numeroTracking: 'AR-987654321X', empresaCorreo: 'Andreani' }; // Datos requeridos por el DTO
    }

    if (!nuevoEstado) return;

    this.logisticaService.actualizarEstado(order.idEnvio, nuevoEstado, datosExtra).subscribe({
      next: (updatedOrder) => {
        // Actualizamos de forma reactiva el ítem en la señal
        this.allOrders.update((orders) =>
          orders.map((o) =>
            o.idEnvio === order.idEnvio
              ? { ...o, estado: nuevoEstado, estadoLogistica: nuevoEstado, ...datosExtra }
              : o,
          ),
        );
      },
      error: (err) => {
        console.error('Error al actualizar el estado del envío', err);
      },
    });
  }
}
