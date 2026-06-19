export type TipoEnvio = 'DOMICILIO' | 'RETIRO_SUCURSAL' | 'DIGITAL';

export interface Logistica {
  idEnvio?: string;
  idVenta: string;
  tipoEnvio: TipoEnvio;
  estado?: string;
  empresaCorreo?: string;
  numeroTracking?: string;
  codigoRetiro?: string;
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}
