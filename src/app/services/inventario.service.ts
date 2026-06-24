import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EmpleadoInventario,
  InventarioItem,
  InventarioMovimiento,
  InventarioMovimientoRequest,
  InventarioMovimientoResponse,
} from '../models/inventario.model';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private readonly inventarioUrl = `${environment.apiUrl}/inventario`;
  private readonly movimientosUrl = `${environment.apiUrl}/inventario/movimientos`;
  private readonly empleadosUrl = `${environment.apiUrl}/ventas/empleados`;

  constructor(private readonly http: HttpClient) {}

  getInventario(): Observable<InventarioItem[]> {
    return this.http
      .get<unknown>(this.inventarioUrl)
      .pipe(map((response) => this.normalizeListResponse<InventarioItem>(response)));
  }

  getEmpleados(): Observable<EmpleadoInventario[]> {
    return this.http
      .get<unknown>(this.empleadosUrl)
      .pipe(map((response) => this.normalizeListResponse<EmpleadoInventario>(response)));
  }

  getMovimientos(): Observable<InventarioMovimiento[]> {
    return this.http
      .get<unknown>(this.movimientosUrl)
      .pipe(map((response) => this.normalizeListResponse<InventarioMovimiento>(response)));
  }

  registrarMovimiento(
    payload: InventarioMovimientoRequest,
  ): Observable<InventarioMovimientoResponse> {
    return this.http.post<InventarioMovimientoResponse>(this.movimientosUrl, payload);
  }

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      const possibleKeys = ['data', 'items', 'results', 'inventario', 'empleados', 'movimientos'];

      for (const key of possibleKeys) {
        const value = payload[key];
        if (Array.isArray(value)) {
          return value as T[];
        }
      }
    }

    return [];
  }
}
