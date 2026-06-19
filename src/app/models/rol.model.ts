export interface Rol {
  idRol?: number;
  nombreRol: string;
}

export interface RolResponse {
  mensaje: string;
  rol?: Rol;
}
