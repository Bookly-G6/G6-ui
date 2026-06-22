import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CatalogStateService {
  readonly searchTerm = signal('');
  readonly selectedCategory = signal('Todos');

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setCategory(value: string): void {
    this.selectedCategory.set(value);
  }

  reset(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('Todos');
  }
}
