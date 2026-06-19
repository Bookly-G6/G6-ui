import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Articulo } from '../../../../models/articulo.model';
import { ArticuloService } from '../../../../services/articulo.services';
import { NotificationService } from '../../../../services/notification';
import { ArticuloFormComponent } from '../../components/articulo-form/articulo-form.component';
import { ArticuloDetailComponent } from '../../components/articulo-detail/articulo-detail.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-articulo-list',
  standalone: true,
  imports: [CommonModule, ArticuloFormComponent, ArticuloDetailComponent, ConfirmDialogComponent],
  templateUrl: './articulo-list.page.html',
  styleUrl: './articulo-list.page.css',
})
export class ArticuloListPage implements OnInit {
  articulos: Articulo[] = [];
  isModalOpen = false;
  selectedArticulo: Articulo | null = null;
  isDetailOpen = false;
  selectedArticuloId: string | null = null;
  isDeleteConfirmOpen = false;
  articuloToDeleteId: string | null = null;

  constructor(
    private articuloService: ArticuloService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadArticulos();
  }

  loadArticulos(): void {
    this.articuloService.getArticulos().subscribe({
      next: (data) => {
        this.articulos = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.show('No se pudieron cargar los artículos.', 'error');
      },
    });
  }

  openModal(articulo: Articulo | null = null): void {
    this.selectedArticulo = articulo;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedArticulo = null;
    this.cdr.detectChanges();
  }

  openDetail(articulo: Articulo): void {
    this.selectedArticuloId = articulo.idArticulo ?? null;
    this.isDetailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.isDetailOpen = false;
    this.selectedArticuloId = null;
  }

  requestDeleteArticulo(id: string | undefined): void {
    if (!id) {
      this.notification.show('No se encontró el artículo para dar de baja.', 'info');
      return;
    }

    this.articuloToDeleteId = id;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.articuloToDeleteId) return;

    const idToDelete = this.articuloToDeleteId;

    this.articuloService.deleteArticulo(idToDelete).subscribe({
      next: () => {
        this.notification.show('Artículo dado de baja correctamente.', 'success');
        this.isDeleteConfirmOpen = false;
        this.articuloToDeleteId = null;
        this.articulos = this.articulos.filter((articulo) => articulo.idArticulo !== idToDelete);
        this.cdr.detectChanges();
        this.loadArticulos();
      },
      error: () => {
        this.notification.show('No se pudo dar de baja el artículo.', 'error');
        this.isDeleteConfirmOpen = false;
        this.articuloToDeleteId = null;
      },
    });
  }

  cancelDelete(): void {
    this.isDeleteConfirmOpen = false;
    this.articuloToDeleteId = null;
  }
}
