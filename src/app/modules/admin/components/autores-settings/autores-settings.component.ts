import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutorArtista } from '../../../../models/catalog.model';
import { CatalogSettingsService } from '../../../../services/catalog-settings.service';
import { NotificationService } from '../../../../services/notification';

@Component({
  selector: 'app-autores-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './autores-settings.component.html',
  styleUrl: './autores-settings.component.css',
})
export class AutoresSettingsComponent {
  private readonly catalogSettings = inject(CatalogSettingsService);
  private readonly notification = inject(NotificationService);

  readonly autores = signal<AutorArtista[]>([]);
  nuevoAutor = '';
  nuevaBiografia = '';

  constructor() {
    this.loadAutores();
  }

  addAutor(): void {
    const nombre = this.nuevoAutor.trim();
    if (!nombre) {
      return;
    }

    this.catalogSettings.createAutor(nombre, this.nuevaBiografia.trim()).subscribe({
      next: () => {
        this.nuevoAutor = '';
        this.nuevaBiografia = '';
        this.notification.show('Autor creado.', 'success');
        this.loadAutores();
      },
      error: () => this.notification.show('No se pudo crear el autor.', 'error'),
    });
  }

  deleteAutor(id: number): void {
    this.catalogSettings.deleteAutor(id).subscribe({
      next: () => {
        this.notification.show('Autor eliminado.', 'info');
        this.loadAutores();
      },
      error: () => this.notification.show('No se pudo eliminar el autor.', 'error'),
    });
  }

  private loadAutores(): void {
    this.catalogSettings.getAutores().subscribe({
      next: (items) => this.autores.set(items),
      error: () => this.autores.set([]),
    });
  }
}
