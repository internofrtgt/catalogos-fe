export type CatalogFieldType = 'string' | 'int' | 'numeric';

export interface CatalogFieldConfig {
  name: string;
  label: string;
  type: CatalogFieldType;
  required?: boolean;
  maxLength?: number;
}

export interface CatalogConfig {
  key: string;
  label: string;
  fields: CatalogFieldConfig[];
  uniqueBy: string[];
  searchPlaceholder?: string;
}

export const catalogConfigs: CatalogConfig[] = [
  {
    key: 'tipos-documento',
    label: 'Tipos de Documentos',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'situaciones-presentacion',
    label: 'Situacion de Presentacion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'actividades-economicas',
    label: 'Actividades Economicas',
    fields: [
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
      { name: 'nombre', label: 'Nombre', type: 'string', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'condiciones-venta',
    label: 'Condiciones de Venta',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-identificacion',
    label: 'Tipos de Identificacion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'formas-farmaceuticas',
    label: 'Formas Farmaceuticas',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-codigo-ps',
    label: 'Tipos de Codigo para P o S',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'unidades-medida',
    label: 'Unidades de Medida',
    fields: [
      { name: 'unidad', label: 'Unidad', type: 'string', required: true },
      { name: 'simbolo', label: 'Simbolo', type: 'string', required: true },
      { name: 'tipoUnidad', label: 'Tipo de Unidad', type: 'string', required: true },
    ],
    uniqueBy: ['unidad'],
  },
  {
    key: 'tipos-transaccion',
    label: 'Tipos de Transaccion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-descuento',
    label: 'Tipos de Descuento',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-impuestos',
    label: 'Tipos de Impuestos',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tarifas-iva',
    label: 'Tarifas de IVA',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-documento-exoneracion',
    label: 'Tipos de Documento de Exoneracion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'instituciones-exoneracion',
    label: 'Instituciones o Dep. Emisoras de Exoneracion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-otros-cargos',
    label: 'Tipos de Otros Cargos',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'codigos-moneda',
    label: 'Codigos de Moneda',
    fields: [
      { name: 'pais', label: 'Pais', type: 'string', required: true },
      { name: 'moneda', label: 'Moneda', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'string', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'medios-pago',
    label: 'Medios de Pago',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'tipos-documento-referencia',
    label: 'Tipos de Documento de Referencia',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'codigos-referencia',
    label: 'Codigos de Referencia',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'mensajes-recepcion',
    label: 'Mensajes de Recepcion',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'condiciones-impuesto',
    label: 'Condicion de Impuesto',
    fields: [
      { name: 'descripcion', label: 'Descripcion', type: 'string', required: true },
      { name: 'codigo', label: 'Codigo', type: 'numeric', required: true },
    ],
    uniqueBy: ['codigo'],
  },
  {
    key: 'cabys',
    label: 'Catálogo de Bienes y Servicios',
    fields: [
      { name: 'categoria', label: 'Categoría', type: 'string', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'string', required: true },
      { name: 'impuesto', label: 'Impuesto', type: 'numeric', required: false },
      { name: 'incluye', label: 'Incluye', type: 'string', required: false },
      { name: 'excluye', label: 'Excluye', type: 'string', required: false },
    ],
    uniqueBy: ['categoria', 'descripcion'],
    searchPlaceholder: 'Buscar por categoría o descripción...',
  },
];

export const catalogConfigMap = new Map(
  catalogConfigs.map((config) => [config.key, config]),
);
