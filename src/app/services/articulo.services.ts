import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Articulo, ArticuloResponse } from '../models/articulo.model';

@Injectable({
  providedIn: 'root',
})
export class ArticuloService {
  private apiUrl = environment.apiUrl + '/articulos';

  constructor(private http: HttpClient) {}

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;
    const possibleKeys = ['data', 'articulos', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  getArticulos(): Observable<Articulo[]> {
    return this.http
      .get<unknown>(this.apiUrl)
      .pipe(map((response) => this.normalizeListResponse<Articulo>(response)));
  }

  getArticuloById(id: string): Observable<Articulo> {
    return this.http.get<Articulo>(`${this.apiUrl}/${id}`);
  }

  createArticulo(articulo: Articulo): Observable<ArticuloResponse> {
    return this.http.post<ArticuloResponse>(this.apiUrl, articulo);
  }

  updateArticulo(id: string, articulo: Articulo): Observable<ArticuloResponse> {
    return this.http.put<ArticuloResponse>(`${this.apiUrl}/${id}`, articulo);
  }

  deleteArticulo(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }
}
