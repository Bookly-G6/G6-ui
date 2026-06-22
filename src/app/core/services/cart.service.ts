import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CartItem {
  idItem: string;
  idProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CartResponse {
  idCarrito: string;
  items: CartItem[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = `${environment.apiUrl}/carrito`;
  readonly isOpen = signal(false);
  readonly items = signal<CartItem[]>([]);

  constructor(private readonly http: HttpClient) {}

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${this.apiUrl}/mio`).pipe(
      tap((cart) => {
        this.items.set(cart.items);
      }),
    );
  }

  addItem(idProducto: string, cantidad: number = 1): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${this.apiUrl}/items`, { idProducto, cantidad }).pipe(
      tap((cart) => {
        this.items.set(cart.items);
      }),
    );
  }

  updateItem(idItem: string, cantidad: number): Observable<CartResponse> {
    return this.http.patch<CartResponse>(`${this.apiUrl}/items/${idItem}`, { cantidad }).pipe(
      tap((cart) => {
        this.items.set(cart.items);
      }),
    );
  }

  removeItem(idItem: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${idItem}`).pipe(
      tap(() => {
        this.items.update((current) => current.filter((item) => item.idItem !== idItem));
      }),
    );
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((current) => !current);
  }

  clear(): void {
    this.items.set([]);
    this.isOpen.set(false);
  }

  get totalItems(): () => number {
    return () => this.items().length;
  }

  get totalAmount(): () => number {
    return () => this.items().reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  }

  add(product: { idProducto?: string }): void {
    if (product.idProducto) {
      this.addItem(product.idProducto, 1).subscribe();
    }
  }
}
