import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddCartItemRequest, Cart, CartItem, UpdateCartItemRequest } from '../../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = `${environment.apiUrl}/carrito`;
  readonly isOpen = signal(false);
  readonly cart = signal<Cart | null>(null);
  readonly items = signal<CartItem[]>([]);

  constructor(private readonly http: HttpClient) {}

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(`${this.apiUrl}/mio`).pipe(tap((cart) => this.setCartState(cart)));
  }

  addItem(payload: AddCartItemRequest): Observable<Cart> {
    return this.http
      .post<Cart>(`${this.apiUrl}/items`, payload)
      .pipe(tap((cart) => this.setCartState(cart)));
  }

  updateItem(idItem: string, payload: UpdateCartItemRequest): Observable<Cart> {
    return this.http
      .patch<Cart>(`${this.apiUrl}/items/${idItem}`, payload)
      .pipe(tap((cart) => this.setCartState(cart)));
  }

  removeItem(idItem: string): Observable<Cart> {
    return this.http.delete<void>(`${this.apiUrl}/items/${idItem}`).pipe(
      map(() => {
        const current = this.cart();
        const nextItems = this.items().filter((item) => item.idItem !== idItem);
        const nextTotal = nextItems.reduce((acc, item) => acc + item.subtotal, 0);

        const nextCart: Cart = {
          idCarrito: current?.idCarrito ?? '',
          idCliente: current?.idCliente ?? '',
          fechaCreacion: current?.fechaCreacion ?? new Date().toISOString(),
          items: nextItems,
          total: nextTotal,
        };

        this.setCartState(nextCart);
        return nextCart;
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
    this.cart.set(null);
    this.items.set([]);
    this.isOpen.set(false);
  }

  get totalItems(): () => number {
    return () => this.items().length;
  }

  get totalAmount(): () => number {
    return () => this.items().reduce((acc, item) => acc + item.subtotal, 0);
  }

  add(product: { idProducto?: string }): void {
    if (product.idProducto) {
      this.addItem({ idProducto: product.idProducto, cantidad: 1 }).subscribe();
    }
  }

  private setCartState(cart: Cart): void {
    this.cart.set(cart);
    this.items.set(cart.items ?? []);
  }
}
