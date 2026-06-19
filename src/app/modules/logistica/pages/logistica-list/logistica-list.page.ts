import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogisticaService } from '../../../../services/logistica.service';
import { Logistica } from '../../../../models/logistica.model';
import { NotificationService } from '../../../../services/notification';
import { LogisticaFormComponent } from '../../components/logistica-form/logistica-form.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-logistica-list',
  standalone: true,
  imports: [CommonModule, LogisticaFormComponent, ConfirmDialogComponent],
  templateUrl: './logistica-list.page.html',
  styleUrl: './logistica-list.page.css',
})
export class LogisticaListPage implements OnInit {
  logisticaList: Logistica[] = [];
  isModalOpen = false;
  selectedLogistica: Logistica | null = null;
  isDeleteConfirmOpen = false;
  logisticaToDeleteId: string | null = null;

  constructor(
    private logisticaService: LogisticaService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadLogistica();
  }

  loadLogistica(): void {
    this.logisticaService.getLogistica().subscribe({
      next: (data) => {
        this.logisticaList = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar las órdenes logísticas.', 'error');
      },
    });
  }

  openModal(logistica: Logistica | null = null): void {
    this.selectedLogistica = logistica;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedLogistica = null;
    this.cdr.detectChanges();
  }

  requestDeleteLogistica(id: string | undefined): void {
    if (!id) {
      this.notification.show('No se encontró la orden logística para eliminar.', 'info');
      return;
    }

    this.logisticaToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.logisticaToDeleteId) return;

    const idToDelete = this.logisticaToDeleteId;

    this.logisticaService.deleteLogistica(idToDelete).subscribe({
      next: () => {
        this.notification.show('La orden logística fue eliminada correctamente.', 'success');
        this.isDeleteConfirmOpen = false;
        this.logisticaToDeleteId = null;
        this.logisticaList = this.logisticaList.filter(
          (logistica) => logistica.idEnvio !== idToDelete,
        );
        this.cdr.detectChanges();
        this.loadLogistica();
      },
      error: () => {
        this.notification.show('No se pudo eliminar la orden logística.', 'error');
        this.isDeleteConfirmOpen = false;
        this.logisticaToDeleteId = null;
      },
    });
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.logisticaToDeleteId = null;
  }

  getEstadoBadgeClass(estado?: string): string {
    switch (estado) {
      case 'ENTREGADO':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-800';
      case 'CANCELADO':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
