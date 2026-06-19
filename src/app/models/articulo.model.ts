export interface Articulo {
  idArticulo?: string;
  codigoBarras: string;
  nombreArticulo: string;
  descripcion?: string;
  activo: boolean;
}

export interface ArticuloResponse {
  mensaje: string;
  articulo?: Articulo;
}
