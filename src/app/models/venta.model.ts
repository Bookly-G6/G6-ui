import { SaleOriginOption, TipoEnvioOption } from '../core/constants/business-options';

export interface CheckoutItemRequest {
  idProducto: string;
  cantidad: number;
  idPromocion: number | null;
}

export interface CheckoutPagoRequest {
  idFormaPago: number;
  montoAbonado: number;
}

export interface CheckoutRequest {
  origenVenta: SaleOriginOption | 'LOCAL';
  idSucursal: number;
  idCliente?: string;
  idEmpleado?: string;
  items: CheckoutItemRequest[];
  pagos: CheckoutPagoRequest[];
  generarEnvio: boolean;
  tipoEnvio: TipoEnvioOption;
  observacionesEnvio?: string;
}

export interface VentaDetalle {
  idProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotalRenglon: number;
}

export interface Venta {
  idVenta: string;
  fecha: string;
  estadoVenta: string;
  origenVenta: string;
  idSucursal: number;
  idCliente?: string;
  idEmpleado?: string;
  subtotalSinDescuentos: number;
  totalFinal: number;
  totalPagado: number;
  idEnvio?: string;
  tipoEnvio?: string;
  detalles: VentaDetalle[];
}
