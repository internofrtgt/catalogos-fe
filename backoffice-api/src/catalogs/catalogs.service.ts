import { Buffer } from 'node:buffer';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { Workbook } from 'exceljs';
import {
  CatalogDefinition,
  CatalogFieldDefinition,
} from './catalog.definitions';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CATALOG_DEFINITIONS } from './catalog.tokens';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

type CatalogRecord = Record<string, any>;

export interface CatalogListResult {
  data: CatalogRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CatalogImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class CatalogsService {
  private readonly definitionsByKey = new Map<string, CatalogDefinition>();

  constructor(
    @Inject(CATALOG_DEFINITIONS)
    private readonly definitions: CatalogDefinition[],
    private readonly dataSource: DataSource,
  ) {
    this.definitions.forEach((definition) => {
      this.definitionsByKey.set(definition.key, definition);
    });
  }

  listDefinitions(): Array<Pick<CatalogDefinition, 'key' | 'label'>> {
    return this.definitions.map(({ key, label }) => ({ key, label }));
  }

  getDefinitionOrThrow(key: string): CatalogDefinition {
    const definition = this.definitionsByKey.get(key);
    if (!definition) {
      throw new NotFoundException(`No existe catálogo para la clave "${key}"`);
    }
    return definition;
  }

  async findAll(
    key: string,
    query: CatalogQueryDto,
  ): Promise<CatalogListResult> {
    const definition = this.getDefinitionOrThrow(key);
    const repository = this.dataSource.getRepository(definition.entity);
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);

    const qb = repository.createQueryBuilder('item');

    if (query.search && definition.searchFields.length > 0) {
      const trimmedSearch = query.search.trim();
      if (trimmedSearch) {
        const escapedTerm = this.escapeLikeSearch(trimmedSearch);
        const likePattern = `%${escapedTerm}%`;
        const validSearchFields = definition.searchFields.filter((field) =>
          definition.fields.some((candidate) => candidate.name === field),
        );

        if (validSearchFields.length > 0) {
          qb.andWhere(
            new Brackets((where) => {
              validSearchFields.forEach((field, index) => {
                const paramName = `search_${index}`;
                where.orWhere(
                  `CAST(item.${field} AS TEXT) ILIKE :${paramName} ESCAPE '\\'`,
                  { [paramName]: likePattern },
                );
              });
            }),
          );
        }
      }
    }

    qb
      .orderBy('item.updatedAt', 'DESC')
      .addOrderBy('item.id', 'DESC')
      .skip((page - 1) * safeLimit)
      .take(safeLimit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit: safeLimit,
      },
    };
  }

  async findOne(key: string, id: string): Promise<CatalogRecord> {
    const definition = this.getDefinitionOrThrow(key);
    const repository = this.dataSource.getRepository(definition.entity);
    const entity = await repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `No se encontró un registro con id "${id}" en ${definition.label}`,
      );
    }
    return entity;
  }

  async create(
    key: string,
    payload: Record<string, any>,
  ): Promise<CatalogRecord> {
    const definition = this.getDefinitionOrThrow(key);
    const repository = this.dataSource.getRepository(definition.entity);
    const validated = this.validatePayload(definition, payload);
    const entity = repository.create(validated);
    return repository.save(entity);
  }

  async update(
    key: string,
    id: string,
    payload: Record<string, any>,
  ): Promise<CatalogRecord> {
    const definition = this.getDefinitionOrThrow(key);
    const repository = this.dataSource.getRepository(definition.entity);
    const entity = await repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `No se encontró un registro con id "${id}" en ${definition.label}`,
      );
    }
    const validated = this.validatePayload(definition, payload, true);
    const merged = repository.merge(entity, validated);
    return repository.save(merged);
  }

  async remove(key: string, id: string): Promise<void> {
    const definition = this.getDefinitionOrThrow(key);
    const repository = this.dataSource.getRepository(definition.entity);
    const result = await repository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(
        `No se encontró un registro con id "${id}" en ${definition.label}`,
      );
    }
  }

  async importFromExcel(
    key: string,
    buffer: Buffer,
    mode: 'append' | 'replace' = 'append',
  ): Promise<CatalogImportResult> {
    const definition = this.getDefinitionOrThrow(key);
    const { rows, errors } = await this.loadExcel(definition, buffer);
    if (rows.length === 0) {
      return { imported: 0, errors };
    }

    const { rows: uniqueRows, duplicates } = this.deduplicateRows(
      rows,
      definition.uniqueBy,
    );

    if (duplicates > 0) {
      errors.push({
        row: 0,
        message: `${duplicates} filas duplicadas fueron reemplazadas por la última aparición de la misma clave única`,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(definition.entity);
      if (mode === 'replace') {
        await repository.clear();
      }
      await repository.upsert(uniqueRows, definition.uniqueBy);
    });

    return {
      imported: uniqueRows.length,
      errors,
    };
  }

  private validatePayload(
    definition: CatalogDefinition,
    payload: Record<string, any>,
    partial = false,
  ): CatalogRecord {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('El cuerpo debe ser un objeto JSON válido');
    }

    const allowedFields = new Set(definition.fields.map((field) => field.name));
    const sanitized: CatalogRecord = {};

    Object.keys(payload).forEach((key) => {
      if (!allowedFields.has(key)) {
        throw new BadRequestException(
          `El campo "${key}" no es válido para este catálogo`,
        );
      }
    });

    definition.fields.forEach((field) => {
      const rawValue = payload[field.name];
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (!partial && field.required) {
          throw new BadRequestException(
            `El campo "${field.name}" es obligatorio`,
          );
        }
        return;
      }

      sanitized[field.name] = this.parseFieldValue(field, rawValue);
    });

    if (!partial) {
      definition.fields
        .filter((field) => field.required)
        .forEach((field) => {
          if (!(field.name in sanitized)) {
            throw new BadRequestException(
              `El campo "${field.name}" es obligatorio`,
            );
          }
        });
    }

    return sanitized;
  }

  private parseFieldValue(
    field: CatalogFieldDefinition,
    rawValue: any,
  ): string | number {
    if (field.type === 'string') {
      if (typeof rawValue !== 'string') {
        rawValue = String(rawValue);
      }
      const value = rawValue.trim();
      if (!value && field.required) {
        throw new BadRequestException(
          `El campo "${field.name}" no puede estar vacío`,
        );
      }
      if (field.length && value.length > field.length) {
        throw new BadRequestException(
          `El campo "${field.name}" excede la longitud máxima de ${field.length}`,
        );
      }
      return value;
    }

    const numericValue = this.normaliseNumeric(rawValue);
    if (field.type === 'int') {
      if (!Number.isInteger(numericValue)) {
        throw new BadRequestException(
          `El campo "${field.name}" debe ser un entero`,
        );
      }
      return numericValue;
    }

    return numericValue;
  }

  private normaliseNumeric(value: any): number {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        throw new BadRequestException('Valor numérico inválido');
      }
      return value;
    }

    if (value === null || value === undefined) {
      throw new BadRequestException('Valor numérico requerido');
    }

    const stringValue = String(value)
      .trim()
      .replace(/,/g, '.');
    if (!stringValue) {
      throw new BadRequestException('Valor numérico requerido');
    }

    const parsed = Number(stringValue);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`No se pudo convertir "${value}" a número`);
    }

    return parsed;
  }

  private escapeLikeSearch(term: string): string {
    return term.replace(/[%_\\]/g, (char) => `\\${char}`);
  }

  private async loadExcel(
    definition: CatalogDefinition,
    buffer: Buffer,
  ): Promise<{
    rows: CatalogRecord[];
    errors: Array<{ row: number; message: string }>;
  }> {
    const workbook = new Workbook();
    await workbook.xlsx.load(Buffer.from(buffer) as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException(
        'El archivo Excel no contiene hojas de trabajo',
      );
    }

    const headerRow = worksheet.getRow(1);
    if (!headerRow || headerRow.cellCount === 0) {
      throw new BadRequestException(
        'La primera fila debe contener los encabezados de columna',
      );
    }

    const columnFieldMap = new Map<number, CatalogFieldDefinition>();
    const availableFields = definition.fields;

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerKey = this.normaliseHeader(cell.value);
      if (!headerKey) {
        return;
      }
      const field = availableFields.find((candidate) => {
        const candidateKeys = [
          candidate.name,
          ...(candidate.excelKeys ?? []),
        ].map((key) => this.normaliseHeader(key));
        return candidateKeys.includes(headerKey);
      });
      if (field) {
        columnFieldMap.set(colNumber, field);
      }
    });

    const missingRequired = availableFields.filter(
      (field) =>
        field.required &&
        !Array.from(columnFieldMap.values()).includes(field),
    );

    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map((field) => field.name).join(', ');
      throw new BadRequestException(
        `Faltan columnas requeridas en el Excel: ${missingNames}`,
      );
    }

    const rows: CatalogRecord[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const rawRecord: CatalogRecord = {};
      let hasValue = false;

      columnFieldMap.forEach((field, column) => {
        const cell = row.getCell(column);
        const value = this.extractCellValue(cell.value);
        if (value !== null && value !== undefined && value !== '') {
          rawRecord[field.name] = value;
          hasValue = true;
        }
      });

      if (!hasValue) {
        return;
      }

      try {
        const validated = this.validatePayload(definition, rawRecord);
        rows.push(validated);
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          message: error.message ?? 'Fila inválida',
        });
      }
    });

    return { rows, errors };
  }

  private extractCellValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') {
        return value.text;
      }

      if ('result' in value && value.result !== undefined) {
        return value.result;
      }

      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText
          .map((segment: any) => segment?.text ?? '')
          .join('')
          .trim();
      }

      if ('hyperlink' in value && 'text' in value) {
        return String(value.text);
      }

      if ('formula' in value && value.formula) {
        return value.result ?? value.formula;
      }

      if (typeof value.toString === 'function') {
        return value.toString();
      }
    }

    return value;
  }

  private deduplicateRows(
    rows: CatalogRecord[],
    uniqueBy: string[],
  ): { rows: CatalogRecord[]; duplicates: number } {
    if (!uniqueBy.length) {
      return { rows, duplicates: 0 };
    }

    const map = new Map<string, CatalogRecord>();
    let duplicates = 0;

    rows.forEach((row) => {
      const key = uniqueBy
        .map((field) => JSON.stringify(row[field] ?? null))
        .join('|');
      if (map.has(key)) {
        duplicates += 1;
      }
      map.set(key, row);
    });

    return { rows: Array.from(map.values()), duplicates };
  }

  private normaliseHeader(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}
