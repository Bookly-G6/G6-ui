import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import { Categoria, EditorialSello, RangoEtario } from '../../../../models/catalog.model';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-catalog-settings-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-settings-panel.component.html',
  styleUrl: './catalog-settings-panel.component.css',
})
export class CatalogSettingsPanelComponent {
  private readonly catalogSettings = inject(CatalogSettingsService);
  private readonly notification = inject(NotificationService);

  readonly categorias = signal<Categoria[]>([]);
  readonly editoriales = signal<EditorialSello[]>([]);
  readonly rangosEtarios = signal<RangoEtario[]>([]);

  nuevaCategoria = '';
  nuevaEditorial = '';
  nuevoRango = '';

  constructor() {
    this.refreshAll();
  }

  addCategoria(): void {
    if (!this.nuevaCategoria.trim()) {
      return;
    }

    this.catalogSettings.createCategoria(this.nuevaCategoria.trim()).subscribe({
      next: () => {
        this.nuevaCategoria = '';
        this.notification.show('Categoría creada.', 'success');
        this.loadCategorias();
      },
      error: () => this.notification.show('No se pudo crear la categoría.', 'error'),
    });
  }

  addEditorial(): void {
    if (!this.nuevaEditorial.trim()) {
      return;
    }

    this.catalogSettings.createEditorial(this.nuevaEditorial.trim()).subscribe({
      next: () => {
        this.nuevaEditorial = '';
        this.notification.show('Editorial creada.', 'success');
        this.loadEditoriales();
      },
      error: () => this.notification.show('No se pudo crear la editorial.', 'error'),
    });
  }

  addRangoEtario(): void {
    if (!this.nuevoRango.trim()) {
      return;
    }

    this.catalogSettings.createRangoEtario(this.nuevoRango.trim()).subscribe({
      next: () => {
        this.nuevoRango = '';
        this.notification.show('Rango etario creado.', 'success');
        this.loadRangosEtarios();
      },
      error: () => this.notification.show('No se pudo crear el rango etario.', 'error'),
    });
  }

  deleteCategoria(id: number): void {
    this.catalogSettings.deleteCategoria(id).subscribe({
      next: () => {
        this.notification.show('Categoría eliminada.', 'info');
        this.loadCategorias();
      },
      error: () => this.notification.show('No se pudo eliminar la categoría.', 'error'),
    });
  }

  deleteEditorial(id: number): void {
    this.catalogSettings.deleteEditorial(id).subscribe({
      next: () => {
        this.notification.show('Editorial eliminada.', 'info');
        this.loadEditoriales();
      },
      error: () => this.notification.show('No se pudo eliminar la editorial.', 'error'),
    });
  }

  deleteRangoEtario(id: number): void {
    this.catalogSettings.deleteRangoEtario(id).subscribe({
      next: () => {
        this.notification.show('Rango etario eliminado.', 'info');
        this.loadRangosEtarios();
      },
      error: () => this.notification.show('No se pudo eliminar el rango etario.', 'error'),
    });
  }

  private refreshAll(): void {
    this.loadCategorias();
    this.loadEditoriales();
    this.loadRangosEtarios();
  }

  private loadCategorias(): void {
    this.catalogSettings.getCategorias().subscribe({
      next: (items) => this.categorias.set(items),
      error: () => this.categorias.set([]),
    });
  }

  private loadEditoriales(): void {
    this.catalogSettings.getEditoriales().subscribe({
      next: (items) => this.editoriales.set(items),
      error: () => this.editoriales.set([]),
    });
  }

  private loadRangosEtarios(): void {
    this.catalogSettings.getRangosEtarios().subscribe({
      next: (items) => this.rangosEtarios.set(items),
      error: () => this.rangosEtarios.set([]),
    });
  }
}
