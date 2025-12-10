import { EntitySchema } from 'typeorm';

export type CatalogFieldType = 'string' | 'int' | 'numeric';

export interface CatalogFieldDefinition {
  name: string;
  type: CatalogFieldType;
  required?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  excelKeys?: string[];
}

export interface CatalogDefinition {
  key: string;
  label: string;
  tableName: string;
  fields: CatalogFieldDefinition[];
  uniqueBy: string[];
  searchFields: string[];
  entity: EntitySchema;
}

const defaultStringLength = 1024;

const definitions: Omit<CatalogDefinition, 'entity'>[] = [
  {
    key: 'tipos-documento',
    label: 'Tipos de Documentos',
    tableName: 'tipos_documento',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'situaciones-presentacion',
    label: 'Situación de Presentación',
    tableName: 'situaciones_presentacion',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'actividades-economicas',
    label: 'Actividades Económicas',
    tableName: 'actividades_economicas',
    fields: [
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
      { name: 'nombre', type: 'string', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['nombre', 'codigo'],
  },
  {
    key: 'condiciones-venta',
    label: 'Condiciones de Venta',
    tableName: 'condiciones_venta',
    fields: [
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-identificacion',
    label: 'Tipos de Identificación',
    tableName: 'tipos_identificacion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'formas-farmaceuticas',
    label: 'Formas Farmacéuticas',
    tableName: 'formas_farmaceuticas',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-codigo-ps',
    label: 'Tipos de Código para P o S',
    tableName: 'tipos_codigo_ps',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'unidades-medida',
    label: 'Unidades de Medida',
    tableName: 'unidades_medida',
    fields: [
      {
        name: 'unidad',
        type: 'string',
        required: true,
        length: 120,
        excelKeys: ['unidad'],
      },
      {
        name: 'simbolo',
        type: 'string',
        required: true,
        length: 30,
        excelKeys: ['simbolo', 'símbolo'],
      },
      {
        name: 'tipoUnidad',
        type: 'string',
        required: true,
        length: 120,
        excelKeys: ['tipodeunidad', 'tipo_unidad'],
      },
    ],
    uniqueBy: ['unidad'],
    searchFields: ['unidad', 'simbolo', 'tipoUnidad'],
  },
  {
    key: 'tipos-transaccion',
    label: 'Tipos de Transacción',
    tableName: 'tipos_transaccion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-descuento',
    label: 'Tipos de Descuento',
    tableName: 'tipos_descuento',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-impuestos',
    label: 'Tipos de Impuestos',
    tableName: 'tipos_impuestos',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tarifas-iva',
    label: 'Tarifas de IVA',
    tableName: 'tarifas_iva',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-exoneracion',
    label: 'Tipos de Documento de Exoneración',
    tableName: 'tipos_documento_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'instituciones-exoneracion',
    label: 'Instituciones o Dep. Emisoras de Exoneración',
    tableName: 'instituciones_exoneracion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-otros-cargos',
    label: 'Tipos de Otros Cargos',
    tableName: 'tipos_otros_cargos',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'int', required: true },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-moneda',
    label: 'Códigos de Moneda',
    tableName: 'codigos_moneda',
    fields: [
      { name: 'pais', type: 'string', required: true, length: 120 },
      { name: 'moneda', type: 'string', required: true, length: 120 },
      { name: 'codigo', type: 'string', required: true, length: 3 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['pais', 'moneda', 'codigo'],
  },
  {
    key: 'medios-pago',
    label: 'Medios de Pago',
    tableName: 'medios_pago',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'tipos-documento-referencia',
    label: 'Tipos de Documento de Referencia',
    tableName: 'tipos_documento_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'codigos-referencia',
    label: 'Códigos de Referencia',
    tableName: 'codigos_referencia',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'mensajes-recepcion',
    label: 'Mensajes de Recepción',
    tableName: 'mensajes_recepcion',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'condiciones-impuesto',
    label: 'Condiciones de Impuesto',
    tableName: 'condiciones_impuesto',
    fields: [
      { name: 'descripcion', type: 'string', required: true },
      { name: 'codigo', type: 'numeric', required: true, precision: 12, scale: 4 },
    ],
    uniqueBy: ['codigo'],
    searchFields: ['descripcion', 'codigo'],
  },
  {
    key: 'cabys',
    label: 'Catálogo de Bienes y Servicios',
    tableName: 'cabys',
    fields: [
      { name: 'categoria', type: 'string', required: true, length: 1024 },
      { name: 'descripcion', type: 'string', required: true, length: 1024 },
      { name: 'impuesto', type: 'numeric', required: false, precision: 2, scale: 0 },
      { name: 'incluye', type: 'string', required: false, length: 1024 },
      { name: 'excluye', type: 'string', required: false, length: 1024 },
    ],
    uniqueBy: ['categoria', 'descripcion'],
    searchFields: ['categoria', 'descripcion'],
  }
];

const numericTransformer = {
  to: (value?: number | null) =>
    value === undefined || value === null ? null : value,
  from: (value?: string | null) =>
    value === undefined || value === null ? null : Number(value),
};

function resolveColumnType(field: CatalogFieldDefinition): Record<string, any> {
  if (field.type === 'string') {
    return {
      type: 'varchar',
      length: field.length ?? defaultStringLength,
      nullable: !field.required,
    };
  }
  if (field.type === 'int') {
    return {
      type: 'int',
      nullable: !field.required,
    };
  }
  return {
    type: 'numeric',
    precision: field.precision ?? 12,
    scale: field.scale ?? 4,
    nullable: !field.required,
    transformer: numericTransformer,
  };
}

function createEntitySchema(def: Omit<CatalogDefinition, 'entity'>): EntitySchema {
  const columns: Record<string, any> = {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamptz',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamptz',
      updateDate: true,
    },
  };

  def.fields.forEach((field) => {
    columns[field.name] = {
      name: field.name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      ...resolveColumnType(field),
    };
  });

  return new EntitySchema({
    name: def.key.replace(/-([a-z])/g, (_, char) => char.toUpperCase()),
    tableName: def.tableName,
    columns,
    indices:
      def.searchFields.length > 0
        ? def.searchFields.map((column) => ({
          name: `${def.tableName}_${column}_idx`,
          columns: [column],
        }))
        : undefined,
    uniques:
      def.uniqueBy.length > 0
        ? [
          {
            name: `${def.tableName}_uq_key`,
            columns: def.uniqueBy,
          },
        ]
        : undefined,
  });
}

export const catalogDefinitions: CatalogDefinition[] = definitions.map((def) => {
  const entity = createEntitySchema(def);
  return {
    ...def,
    entity,
  };
});

export const catalogDefinitionsMap = new Map(
  catalogDefinitions.map((def) => [def.key, def]),
);

export const catalogEntitySchemas = catalogDefinitions.map((def) => def.entity);
