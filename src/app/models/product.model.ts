export interface Product {
  idProducto?: string; // Opcional (?) porque al hacer el POST el backend lo genera automáticamente como UUID
  codigoBarras: string;
  nombreProducto: string;
  descripcion?: string;
  precioActual: number;
  activo: boolean;
  idTipoProducto: number;
  idEditorialSello: number;
  idRangoEtario: number;
}
