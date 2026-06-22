import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipoProducto } from '../../../../models/catalog.model';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-tipo-producto-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-producto-settings.component.html',
  styleUrl: './tipo-producto-settings.component.css',
})
export class TipoProductoSettingsComponent {
  private readonly catalogSettings = inject(CatalogSettingsService);
  private readonly notification = inject(NotificationService);

  readonly tiposProducto = signal<TipoProducto[]>([]);
  nuevoTipo = '';

  constructor() {
    this.loadTiposProducto();
  }

  addTipoProducto(): void {
    const nombre = this.nuevoTipo.trim();
    if (!nombre) {
      return;
    }

    this.catalogSettings.createTipoProducto(nombre).subscribe({
      next: () => {
        this.nuevoTipo = '';
        this.notification.show('Tipo de producto creado.', 'success');
        this.loadTiposProducto();
      },
      error: () => this.notification.show('No se pudo crear el tipo de producto.', 'error'),
    });
  }

  deleteTipoProducto(id: number): void {
    this.catalogSettings.deleteTipoProducto(id).subscribe({
      next: () => {
        this.notification.show('Tipo de producto eliminado.', 'info');
        this.loadTiposProducto();
      },
      error: () => this.notification.show('No se pudo eliminar el tipo de producto.', 'error'),
    });
  }

  private loadTiposProducto(): void {
    this.catalogSettings.getTiposProducto().subscribe({
      next: (items) => this.tiposProducto.set(items),
      error: () => this.tiposProducto.set([]),
    });
  }
}
