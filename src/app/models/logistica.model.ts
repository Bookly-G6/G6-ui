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
