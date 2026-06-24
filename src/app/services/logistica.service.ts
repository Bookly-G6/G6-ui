import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Logistica, EnvioEnriquecido } from '../models/logistica.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LogisticaService {
  private apiUrl = environment.apiUrl + '/envios';

  constructor(private http: HttpClient) {}

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;
    const possibleKeys = ['data', 'logistica', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  getLogistica(): Observable<Logistica[]> {
    return this.http.get<unknown>(this.apiUrl).pipe(
      map((response) =>
        this.normalizeListResponse<Logistica>(response).map((item) => ({
          ...item,
          estado: item.estado ?? item.estadoLogistica,
        })),
      ),
    );
  }

  getLogisticaById(id: string): Observable<Logistica> {
    return this.http.get<Logistica>(`${this.apiUrl}/${id}`);
  }

  getEnviosPendientes(params?: {
    idVenta?: string;
    terminoBusqueda?: string;
    page?: number;
    size?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.idVenta) httpParams = httpParams.set('idVenta', params.idVenta);
      if (params.terminoBusqueda) httpParams = httpParams.set('terminoBusqueda', params.terminoBusqueda);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/pendientes`, { params: httpParams });
  }

  getDetalleCompleto(id: string): Observable<EnvioEnriquecido> {
    return this.http.get<EnvioEnriquecido>(`${this.apiUrl}/${id}/detalle-completo`);
  }

  getLogisticaByVenta(idVenta: string): Observable<Logistica> {
    return this.http.get<Logistica>(`${this.apiUrl}/venta/${idVenta}`);
  }

  createLogistica(logistica: Logistica): Observable<Logistica> {
    return this.http.post<Logistica>(this.apiUrl, logistica);
  }

  updateLogistica(id: string, logistica: Logistica): Observable<Logistica> {
    return this.http.put<Logistica>(`${this.apiUrl}/${id}`, logistica);
  }

  actualizarEstado(
    idEnvio: string,
    nuevoEstado: string,
    idEmpleado: string,
    datos?: { numeroTracking?: string; empresaCorreo?: string },
  ): Observable<Logistica> {
    const body = {
      nuevoEstado,
      idEmpleado,
      ...datos,
    };
    return this.http.patch<Logistica>(`${this.apiUrl}/${idEnvio}/estado`, body);
  }

  deleteLogistica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
