import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LogisticaService } from '../../../../services/logistica.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { NotificationService } from '../../../../services/notification';
import { Logistica, EnvioEnriquecido } from '../../../../models/logistica.model';
import { LOGISTICA_ESTADO_OPTIONS, LOGISTICA_ESTADO_OPTIONS as ALL_ESTADOS } from '../../../../core/constants/business-options';

@Component({
  selector: 'app-admin-orders-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-orders.page.html',
  styleUrl: './admin-orders.page.css',
})
export class AdminOrdersPage implements OnInit {
  private readonly logisticaService = inject(LogisticaService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  // Estados
  readonly activeTab = signal<'pendientes' | 'historial'>('pendientes');
  readonly loading = signal(true);
  readonly loadingDetail = signal(false);
  readonly submittingDispatch = signal(false);

  // Datos
  readonly pendingShipments = signal<Logistica[]>([]);
  readonly historyShipments = signal<Logistica[]>([]);
  readonly employees = signal<any[]>([]);
  readonly allEstados = ALL_ESTADOS;

  // Paginación y Búsqueda para Pendientes (Backend/Spring)
  readonly searchTerm = signal('');
  readonly currentPage = signal(0); // 0-indexed para Spring
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);
  readonly pageSize = 10;

  // Paginación y Búsqueda para Historial (Local)
  readonly searchTermHistory = signal('');
  readonly currentPageHistory = signal(1); // 1-indexed local
  readonly pageSizeHistory = 10;

  readonly filteredHistoryRows = computed(() => {
    const term = this.searchTermHistory().toLowerCase().trim();
    const rows = this.historyShipments();
    if (!term) return rows;
    return rows.filter(
      (h) =>
        (h.idEnvio ?? '').toLowerCase().includes(term) ||
        (h.idVenta ?? '').toLowerCase().includes(term) ||
        (h.estadoLogistica ?? h.estado ?? '').toLowerCase().includes(term) ||
        (h.empresaCorreo ?? '').toLowerCase().includes(term) ||
        (h.numeroTracking ?? '').toLowerCase().includes(term) ||
        (h.codigoRetiro ?? '').toLowerCase().includes(term)
    );
  });

  readonly totalPagesHistory = computed(() =>
    Math.max(1, Math.ceil(this.filteredHistoryRows().length / this.pageSizeHistory))
  );

  readonly paginatedHistoryRows = computed(() => {
    const start = (this.currentPageHistory() - 1) * this.pageSizeHistory;
    return this.filteredHistoryRows().slice(start, start + this.pageSizeHistory);
  });

  // Modales y Detalles seleccionados
  readonly selectedDetail = signal<EnvioEnriquecido | null>(null);
  readonly showDetailModal = signal(false);
  readonly showDispatchModal = signal(false);
  readonly shippingToDispatch = signal<Logistica | null>(null);

  // Formulario de Despacho
  readonly dispatchForm = this.fb.group({
    idEmpleado: ['', [Validators.required]],
    nuevoEstado: ['EN_CAMINO', [Validators.required]],
    empresaCorreo: [''],
    numeroTracking: [''],
  });

  constructor() {}

  ngOnInit(): void {
    this.loadData();
    this.loadEmployees();
  }

  loadData(): void {
    if (this.activeTab() === 'pendientes') {
      this.loadPending();
    } else {
      this.loadHistory();
    }
  }

  setTab(tab: 'pendientes' | 'historial'): void {
    this.activeTab.set(tab);
    this.loadData();
  }

  loadPending(page: number = 0): void {
    this.loading.set(true);
    this.currentPage.set(page);

    this.logisticaService
      .getEnviosPendientes({
        terminoBusqueda: this.searchTerm().trim() || undefined,
        page: page,
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.pendingShipments.set(res?.content || []);
          this.totalPages.set(res?.totalPages || 1);
          this.totalElements.set(res?.totalElements || 0);
          this.loading.set(false);
        },
        error: () => {
          this.pendingShipments.set([]);
          this.loading.set(false);
          this.notification.show('Error al cargar la bandeja de pendientes.', 'error');
        },
      });
  }

  loadHistory(): void {
    this.loading.set(true);
    this.logisticaService.getLogistica().subscribe({
      next: (res) => {
        this.historyShipments.set(res || []);
        this.loading.set(false);
      },
      error: () => {
        this.historyShipments.set([]);
        this.loading.set(false);
        this.notification.show('Error al cargar el historial de envíos.', 'error');
      },
    });
  }

  loadEmployees(): void {
    this.checkoutService.getEmpleadosVenta().subscribe({
      next: (data) => {
        this.employees.set(data);
        if (data.length > 0) {
          this.dispatchForm.patchValue({ idEmpleado: data[0].idEmpleado });
        }
      },
      error: () => {
        this.employees.set([]);
      },
    });
  }

  onSearchChange(): void {
    this.loadPending(0);
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.loadPending(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.loadPending(this.currentPage() + 1);
    }
  }

  // Ver Detalle Completo
  verDetalle(idEnvio: string | undefined): void {
    if (!idEnvio) return;
    this.loadingDetail.set(true);
    this.showDetailModal.set(true);

    this.logisticaService.getDetalleCompleto(idEnvio).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.loadingDetail.set(false);
        this.showDetailModal.set(false);
        this.notification.show('No se pudo cargar el detalle del paquete.', 'error');
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDetail.set(null);
  }

  // Abrir Formulario de Despacho / Cambio de Estado
  abrirDespacho(shipping: Logistica, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Evitar abrir el detalle si hacen click en el botón
    }
    
    this.shippingToDispatch.set(shipping);
    const estadoActual = (shipping.estadoLogistica ?? shipping.estado ?? 'EN_PREPARACION').toUpperCase();
    
    // Sugerir el siguiente estado lógico
    let siguienteEstado = 'EN_CAMINO';
    if (estadoActual === 'EN_PREPARACION') {
      siguienteEstado = shipping.tipoEnvio === 'RETIRO_LOCAL' ? 'LISTO_PARA_RETIRO' : 'EN_CAMINO';
    } else if (estadoActual === 'EN_CAMINO' || estadoActual === 'LISTO_PARA_RETIRO') {
      siguienteEstado = 'ENTREGADO';
    } else {
      siguienteEstado = estadoActual;
    }

    this.dispatchForm.patchValue({
      nuevoEstado: siguienteEstado,
      empresaCorreo: shipping.empresaCorreo || '',
      numeroTracking: shipping.numeroTracking || '',
    });
    this.showDispatchModal.set(true);
  }

  closeDispatchModal(): void {
    this.showDispatchModal.set(false);
    this.shippingToDispatch.set(null);
  }

  submitDispatch(): void {
    if (this.dispatchForm.invalid || !this.shippingToDispatch()) {
      this.dispatchForm.markAllAsTouched();
      return;
    }

    const shipping = this.shippingToDispatch()!;
    const formVal = this.dispatchForm.getRawValue();

    this.submittingDispatch.set(true);
    this.logisticaService
      .actualizarEstado(
        shipping.idEnvio!,
        formVal.nuevoEstado!,
        formVal.idEmpleado!,
        {
          empresaCorreo: formVal.empresaCorreo || undefined,
          numeroTracking: formVal.numeroTracking || undefined,
        }
      )
      .subscribe({
        next: (updated) => {
          this.submittingDispatch.set(false);
          this.closeDispatchModal();
          this.notification.show('Estado del envío actualizado correctamente.', 'success');
          
          // Recargar la pestaña activa
          this.loadData();
          
          // Si el detalle enriquecido estaba abierto y era del mismo envío, refrescarlo
          if (this.selectedDetail()?.idEnvio === shipping.idEnvio) {
            this.verDetalle(shipping.idEnvio);
          }
        },
        error: (err) => {
          this.submittingDispatch.set(false);
          const msg = err?.error?.message || 'Error al actualizar el estado del envío.';
          this.notification.show(msg, 'error');
        },
      });
  }

  // Simulación de etiqueta de impresión
  imprimirEtiqueta(detail: EnvioEnriquecido): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.notification.show('Permita las ventanas emergentes para imprimir la etiqueta.', 'info');
      return;
    }

    const barcode = detail.idEnvio.slice(0, 18).toUpperCase();
    const addressHtml = detail.tipoEnvio === 'DOMICILIO' 
      ? `<p><strong>Dirección de Entrega:</strong> ${detail.direccionEntrega || 'No especificada'}</p>`
      : `<p><strong>Retira en sucursal con el código:</strong> <span style="font-family: monospace; font-size: 1.2rem; background: #eee; padding: 2px 6px; border-radius: 4px;">${detail.codigoRetiro || 'PENDIENTE'}</span></p>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta de Despacho - Bookly</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .label-card { border: 3px double #000; padding: 20px; max-width: 450px; margin: 0 auto; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 1.8rem; letter-spacing: 2px; }
            .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 3rem; text-align: center; margin: 15px 0; letter-spacing: 5px; }
            .barcode-text { font-family: monospace; text-align: center; font-size: 0.9rem; margin-bottom: 15px; }
            .info { font-size: 0.95rem; line-height: 1.5; }
            .footer { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; text-align: center; font-size: 0.8rem; color: #666; }
            @media print {
              body { padding: 0; }
              .label-card { border: 3px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">
              <h1>BOOKLY LOGÍSTICA</h1>
              <small>ETIQUETA DE DESPACHO OFICIAL</small>
            </div>
            
            <div class="info">
              <p><strong>Destinatario:</strong> ${detail.nombreCliente || ''} ${detail.apellidoCliente || ''}</p>
              <p><strong>DNI:</strong> ${detail.dniCliente || 'N/A'} | <strong>Teléfono:</strong> ${detail.telefonoCliente || 'N/A'}</p>
              <p><strong>Email:</strong> ${detail.emailCliente || 'N/A'}</p>
              ${addressHtml}
              <p><strong>Venta N°:</strong> ${detail.idVenta.toUpperCase()}</p>
            </div>

            <div class="barcode">*${barcode}*</div>
            <div class="barcode-text">${detail.idEnvio}</div>

            <div class="footer">
              Mercadería controlada. Escanee al despachar y entregar.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  getEmployeeName(employeeId: string | undefined): string {
    if (!employeeId) return 'N/A';
    const emp = this.employees().find((e) => e.idEmpleado === employeeId);
    if (!emp) return employeeId.slice(0, 8);
    return this.getEmployeeLabel(emp);
  }

  getEmployeeLabel(employee: any): string {
    if (employee.nombreCompleto) return employee.nombreCompleto;
    return `${employee.nombre ?? ''} ${employee.apellido ?? ''}`.trim() || employee.idEmpleado;
  }

  onSearchHistoryChange(): void {
    this.currentPageHistory.set(1);
  }

  goToPageHistory(page: number): void {
    if (page < 1 || page > this.totalPagesHistory()) return;
    this.currentPageHistory.set(page);
  }

  prevPageHistory(): void {
    this.goToPageHistory(this.currentPageHistory() - 1);
  }

  nextPageHistory(): void {
    this.goToPageHistory(this.currentPageHistory() + 1);
  }

  private readonly historyExportHeaders = [
    'ID Envío',
    'ID Venta',
    'Tipo Envío',
    'Estado',
    'Transportista',
    'N° Tracking',
    'Código Retiro',
    'Fecha Actualización'
  ];

  private formatHistoryDate(value: string | undefined): string {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private getHistoryExportRows(): (string | number)[][] {
    return this.filteredHistoryRows().map((h) => [
      `ENV-${(h.idEnvio || '').slice(0, 8).toUpperCase()}`,
      `VTA-${(h.idVenta || '').slice(0, 8).toUpperCase()}`,
      h.tipoEnvio || '--',
      h.estadoLogistica || h.estado || 'PREPARANDO',
      h.empresaCorreo || '--',
      h.numeroTracking || '--',
      h.codigoRetiro || 'N/A',
      this.formatHistoryDate(h.fechaActualizacion)
    ]);
  }

  exportHistoryPdf(): void {
    const doc = new jsPDF();
    doc.text('Historial de Envíos y Despachos - Bookly', 14, 15);
    autoTable(doc, {
      head: [this.historyExportHeaders],
      body: this.getHistoryExportRows(),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save('historial-envios.pdf');
  }

  exportHistoryExcel(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.historyExportHeaders, ...this.getHistoryExportRows()]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Envíos');
    XLSX.writeFile(workbook, 'historial-envios.xlsx');
  }

  exportHistoryCsv(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.historyExportHeaders, ...this.getHistoryExportRows()]);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'historial-envios.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
