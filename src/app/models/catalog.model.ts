export interface Categoria {
  idCategoria: number;
  nombreCategoria: string;
  activa?: boolean;
}

export interface EditorialSello {
  idEditorialSello: number;
  nombreEditorial: string;
  activa?: boolean;
}

export interface RangoEtario {
  idRangoEtario: number;
  descripcion: string;
}

export interface TipoProducto {
  idTipoProducto: number;
  nombreTipoProducto: string;
  activa?: boolean;
}

export interface AutorArtista {
  idAutorArtista: number;
  nombre: string;
  biografia?: string;
  activa?: boolean;
}
