import { Product } from './product.model';
import { Rol } from './rol.model';
import { StockMovimientoOption } from '../core/constants/business-options';

export interface EmpleadoInventario {
  idEmpleado: string;
  nombre?: string;
  apellido?: string;
  nombreCompleto?: string;
  email?: string;
  rol?: string | Rol;
}

export interface InventarioMovimientoRequest {
  idProducto: string;
  cantidad: number;
  tipoMovimiento: StockMovimientoOption;
  idEmpleado: string;
}

export interface InventarioMovimientoResponse {
  idMovimiento: number;
  idSucursal: number;
  idProducto: string;
  cantidad: number;
  tipoMovimiento: StockMovimientoOption;
  fecha: string;
  idEmpleado: string;
  stockResultante: number;
}

export interface InventarioMovimiento extends InventarioMovimientoResponse {}

export interface InventarioSucursal {
  idSucursal: number;
  nombre: string;
  direccion?: string | null;
  activa: boolean;
}

export interface InventarioItem {
  idSucursal: number;
  idProducto: string;
  stock: number;
  sucursal?: InventarioSucursal;
  producto?: Product;
}
