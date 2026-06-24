export interface Product {
  idProducto?: string;
  codigoBarras: string;
  nombreProducto: string;
  descripcion?: string;
  precioCosto?: number;
  precioActual: number;
  activo: boolean;
  stock?: number;
  idTipoProducto: number;
  idEditorialSello: number;
  idRangoEtario: number;
  idsCategorias?: number[];
  idsAutores?: number[];
  tipoProducto?: string;
  editorialSello?: string;
  rangoEtario?: string;
  categorias?: string[];
  autores?: string[];
  atributosEspecificos?: Record<string, unknown>;
}
