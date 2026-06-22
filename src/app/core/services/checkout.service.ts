import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CheckoutRequest {
  direccionEnvio: string;
  numeroTelefono?: string;
  observaciones?: string;
}

export interface CheckoutResponse {
  idVenta: string;
  email: string;
  montoTotal: number;
  estado: string;
  fecha: string;
}

export interface OrderDetail {
  idVenta: string;
  email: string;
  montoTotal: number;
  estado: string;
  items: OrderItem[];
  envio?: OrderShipment;
  fecha: string;
}

export interface OrderItem {
  idProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface OrderShipment {
  idEnvio: string;
  tipoEnvio: string;
  estadoLogistica: string;
  numeroTracking?: string;
  empresaCorreo?: string;
  fechaActualizacion: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly apiUrl = `${environment.apiUrl}/ventas`;

  constructor(private readonly http: HttpClient) {}

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.apiUrl}/checkout`, request);
  }

  getMyOrders(): Observable<OrderDetail[]> {
    return this.http.get<OrderDetail[]>(`${this.apiUrl}/mis-ordenes`);
  }

  getOrderDetail(idVenta: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.apiUrl}/${idVenta}`);
  }
}
