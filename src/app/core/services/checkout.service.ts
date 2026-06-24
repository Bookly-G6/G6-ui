import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutRequest, Venta } from '../../models/venta.model';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private readonly http: HttpClient) {}

  checkout(request: CheckoutRequest): Observable<Venta> {
    return this.http.post<Venta>(`${this.apiUrl}/checkout`, request);
  }

  getMyOrders(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.apiUrl}/mis-ordenes`);
  }

  getOrderDetail(idVenta: string): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${idVenta}`);
  }

  getFormasPago(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formas-pago`);
  }

  getTiposVenta(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tipos-venta`);
  }

  getEmpleadosVenta(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados`);
  }
}
