/** Tipos de valores para atributos de producto */
export type AttributeFieldType = 'select' | 'text' | 'number' | 'boolean';

export interface ProductAttributeConfig {
  key: string; // identificador único (ej: 'tapa', 'isbn')
  label: string; // etiqueta a mostrar en el form
  type: AttributeFieldType; // tipo de campo
  required?: boolean; // si es obligatorio (default: false para opcionales)
  options?: string[]; // para type='select', las opciones disponibles
  placeholder?: string; // sugerencia de entrada para text/number
  defaultValue?: unknown; // valor por defecto
}

/**
 * Configuración de atributos de producto.
 * Se puede extender fácilmente agregando más objetos al array.
 * Todos los atributos son OPCIONALES por defecto (required: false).
 */
export const PRODUCT_ATTRIBUTES_CONFIG: ProductAttributeConfig[] = [
  {
    key: 'tapa',
    label: 'Tapa',
    type: 'select',
    options: ['Blanda', 'Dura'],
  },
  {
    key: 'idioma',
    label: 'Idioma',
    type: 'select',
    options: ['Español', 'Inglés', 'Francés', 'Português', 'Otros'],
  },
  {
    key: 'paginas',
    label: 'Cantidad de páginas',
    type: 'number',
    placeholder: 'Ej: 464',
  },
  {
    key: 'anio_publicacion',
    label: 'Año de publicación',
    type: 'number',
    placeholder: new Date().getFullYear().toString(),
  },
  {
    key: 'dimensiones',
    label: 'Dimensiones (ancho x alto x profundo en cm)',
    type: 'text',
    placeholder: 'Ej: 15 x 23 x 2',
  },
  {
    key: 'peso',
    label: 'Peso (en gramos)',
    type: 'number',
    placeholder: 'Ej: 450',
  },
  {
    key: 'ilustrado',
    label: 'Ilustrado',
    type: 'boolean',
  },
  {
    key: 'edicion_limitada',
    label: 'Edición limitada',
    type: 'boolean',
  },
  {
    key: 'numero_tomo',
    label: 'Número de tomo',
    type: 'number',
    placeholder: 'Si corresponde',
  },
  {
    key: 'formato',
    label: 'Formato',
    type: 'select',
    options: ['Físico', 'EPUB', 'PDF', 'MOBI'],
  },
];

export const SALE_ORIGIN_OPTIONS = ['WEB', 'LOCAL'] as const;
export type SaleOriginOption = (typeof SALE_ORIGIN_OPTIONS)[number];

export const LOGISTICA_ESTADO_OPTIONS = [
  'EN_PREPARACION',
  'LISTO_PARA_RETIRO',
  'DESPACHADO',
  'EN_CAMINO',
  'ENTREGADO',
  'CANCELADO',
  'DEVUELTO',
] as const;

export type LogisticaEstadoOption = (typeof LOGISTICA_ESTADO_OPTIONS)[number];

export const TIPO_ENVIO_OPTIONS = ['DOMICILIO', 'RETIRO_LOCAL'] as const;
export type TipoEnvioOption = (typeof TIPO_ENVIO_OPTIONS)[number];

export const ADMIN_TIPO_ENVIO_OPTIONS = [...TIPO_ENVIO_OPTIONS, 'DIGITAL'] as const;
export type AdminTipoEnvioOption = (typeof ADMIN_TIPO_ENVIO_OPTIONS)[number];

export interface FormaPagoOption {
  idFormaPago: number;
  label: string;
}

export const FORMA_PAGO_OPTIONS: FormaPagoOption[] = [
  { idFormaPago: 1, label: 'Efectivo' },
  { idFormaPago: 2, label: 'Tarjeta débito' },
  { idFormaPago: 3, label: 'Tarjeta crédito' },
  { idFormaPago: 4, label: 'Transferencia' },
];

export const STOCK_MOVIMIENTO_OPTIONS = ['ENTRADA', 'SALIDA'] as const;
export type StockMovimientoOption = (typeof STOCK_MOVIMIENTO_OPTIONS)[number];
