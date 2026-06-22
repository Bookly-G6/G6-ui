import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, EditorialSello, RangoEtario, TipoProducto } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogSettingsService {
  private readonly apiV1 = environment.apiUrl;
  private readonly baseUrl = environment.apiUrl.replace(/\/api\/v1$/, '');

  constructor(private readonly http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
    return this.http
      .get<unknown>(`${this.apiV1}/categorias`)
      .pipe(map((response) => this.normalizeList<Categoria>(response, ['categorias'])));
  }

  createCategoria(nombreCategoria: string): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.apiV1}/categorias`, {
      nombreCategoria,
      activa: true,
    });
  }

  deleteCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiV1}/categorias/${id}`);
  }

  getEditoriales(): Observable<EditorialSello[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/editorial-sello`)
      .pipe(
        map((response) =>
          this.normalizeList<EditorialSello>(response, ['editoriales', 'editorialSello']),
        ),
      );
  }

  createEditorial(nombreEditorial: string): Observable<EditorialSello> {
    return this.http.post<EditorialSello>(`${this.baseUrl}/editorial-sello`, {
      nombreEditorial,
      activa: true,
    });
  }

  deleteEditorial(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/editorial-sello/${id}`);
  }

  getRangosEtarios(): Observable<RangoEtario[]> {
    return this.http
      .get<unknown>(`${this.apiV1}/rangos-etarios`)
      .pipe(map((response) => this.normalizeList<RangoEtario>(response, ['rangosEtarios'])));
  }

  createRangoEtario(descripcion: string): Observable<RangoEtario> {
    return this.http.post<RangoEtario>(`${this.apiV1}/rangos-etarios`, { descripcion });
  }

  deleteRangoEtario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiV1}/rangos-etarios/${id}`);
  }

  getTiposProducto(): Observable<TipoProducto[]> {
    return this.http
      .get<unknown>(`${this.apiV1}/tipos-producto`)
      .pipe(map((response) => this.normalizeList<TipoProducto>(response, ['tiposProducto'])));
  }

  private normalizeList<T>(response: unknown, aliases: string[] = []): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;
    const keys = ['data', 'items', 'results', ...aliases];

    for (const key of keys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }
}
