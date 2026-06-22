import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environment';

export interface ProductUpsertPayload {
  codigoBarras: string;
  nombreProducto: string;
  descripcion?: string;
  precioCosto?: number;
  precioActual: number;
  activo: boolean;
  idTipoProducto: number;
  idEditorialSello: number;
  idRangoEtario: number;
  idsCategorias?: number[];
  idsAutores?: number[];
  atributosEspecificos?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = environment.apiUrl + '/productos';
  private apiDetailUrl = environment.apiUrl + '/producto';

  constructor(private http: HttpClient) {}

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;

    const possibleKeys = ['data', 'productos', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  getProducts(): Observable<Product[]> {
    return this.http
      .get<unknown>(this.apiUrl)
      .pipe(map((response) => this.normalizeListResponse<Product>(response)));
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getStorefrontProductById(id: string): Observable<Product> {
    return this.http.get<unknown>(`${this.apiDetailUrl}/${id}`).pipe(
      map((response) => this.normalizeSingleResponse<Product>(response)),
      catchError(() =>
        this.http
          .get<unknown>(`${this.apiUrl}/${id}`)
          .pipe(map((response) => this.normalizeSingleResponse<Product>(response))),
      ),
    );
  }

  createProduct(product: Product | ProductUpsertPayload): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string, product: Product | ProductUpsertPayload): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private normalizeSingleResponse<T>(response: unknown): T {
    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      const data = payload['data'];
      if (data && typeof data === 'object') {
        return data as T;
      }
    }

    return response as T;
  }
}
