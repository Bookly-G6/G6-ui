import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario, UsuarioResponse } from '../models/usuario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = environment.apiUrl + '/usuarios';

  constructor(private http: HttpClient) {}

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;
    const possibleKeys = ['data', 'usuarios', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  private normalizeUsuario(usuario: Usuario): Usuario {
    const estado = typeof usuario.estado === 'string' ? usuario.estado.trim().toLowerCase() : '';
    const activo =
      typeof usuario.activo === 'boolean'
        ? usuario.activo
        : ['activo', 'active', 'true', '1'].includes(estado);

    return {
      ...usuario,
      activo,
    };
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http
      .get<unknown>(this.apiUrl)
      .pipe(
        map((response) =>
          this.normalizeListResponse<Usuario>(response).map((usuario) =>
            this.normalizeUsuario(usuario),
          ),
        ),
      );
  }

  getUsuarioById(id: string): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => this.normalizeUsuario(response)));
  }

  createUsuario(usuario: Usuario): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(this.apiUrl, usuario);
  }

  updateUsuario(id: string, usuario: Usuario): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}`, usuario);
  }

  deleteUsuario(id: string): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.apiUrl}/${id}/inactivar`, {});
  }
}
