import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Rol, RolResponse } from '../models/rol.model';

@Injectable({
  providedIn: 'root',
})
export class RolService {
  private apiUrl = environment.apiUrl + '/roles';

  constructor(private http: HttpClient) {}

  private normalizeListResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response as Record<string, unknown>;
    const possibleKeys = ['data', 'roles', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = payload?.[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  getRoles(): Observable<Rol[]> {
    return this.http
      .get<unknown>(this.apiUrl)
      .pipe(map((response) => this.normalizeListResponse<Rol>(response)));
  }

  getRoleById(id: number | string): Observable<Rol> {
    return this.http.get<Rol>(`${this.apiUrl}/${id}`);
  }

  createRole(role: Rol): Observable<RolResponse> {
    return this.http.post<RolResponse>(this.apiUrl, role);
  }

  updateRole(id: number | string, role: Rol): Observable<RolResponse> {
    return this.http.put<RolResponse>(`${this.apiUrl}/${id}`, role);
  }

  deleteRole(id: number | string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }
}
