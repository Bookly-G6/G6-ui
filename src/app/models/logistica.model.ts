import { LogisticaEstadoOption, TipoEnvioOption } from '../core/constants/business-options';

export type TipoEnvio = TipoEnvioOption | 'DIGITAL';
export type EstadoLogistica = LogisticaEstadoOption;

export interface Logistica {
  idEnvio?: string;
  idVenta: string;
  tipoEnvio: TipoEnvio;
  estado?: EstadoLogistica | string;
  estadoLogistica?: EstadoLogistica | string;
  empresaCorreo?: string;
  numeroTracking?: string;
  codigoRetiro?: string;
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface EnvioProductoDetalle {
  idProducto: string;
  codigoBarras?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario?: number;
  subtotalRenglon?: number;
}

export interface EnvioEnriquecido {
  idEnvio: string;
  idVenta: string;
  tipoEnvio: TipoEnvio;
  estadoLogistica: EstadoLogistica | string;
  codigoRetiro?: string;
  empresaCorreo?: string;
  numeroTracking?: string;
  fechaActualizacion?: string;
  observaciones?: string;
  
  // Datos enriquecidos
  nombreCliente?: string;
  apellidoCliente?: string;
  dniCliente?: string;
  telefonoCliente?: string;
  emailCliente?: string;
  direccionEntrega?: string;
  productos: EnvioProductoDetalle[];
}

export interface ActualizarEstadoRequest {
  nuevoEstado: string;
  numeroTracking?: string;
  empresaCorreo?: string;
  idEmpleado: string; // Obligatorio para auditoría
}
