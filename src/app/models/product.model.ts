export interface Product {
  id_producto: string; // Usamos string porque mapea con el UUID del backend
  codigo_barras: string;
  nombre_producto: string;
  descripcion?: string; // Opcional
  precio_actual: number;
  activo: boolean;
  id_tipo_producto: number;
  id_editorial_sello: number;
  id_rango_etario: number;
}
