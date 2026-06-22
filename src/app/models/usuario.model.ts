import { Rol } from './rol.model';

export interface Usuario {
  idUsuario?: string;
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
  activo?: boolean;
  estado?: string;
  idRol?: number;
  rol?: string | Rol;
}

export interface UsuarioResponse {
  usuario: Usuario;
  mensaje: string;
}
