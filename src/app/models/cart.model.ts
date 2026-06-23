export interface CartItem {
  idItem: string;
  idProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Cart {
  idCarrito: string;
  idCliente: string;
  items: CartItem[];
  total: number;
  fechaCreacion: string;
}

export interface AddCartItemRequest {
  idProducto: string;
  cantidad: number;
}

export interface UpdateCartItemRequest {
  cantidad: number;
}
