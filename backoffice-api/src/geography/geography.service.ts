import { Buffer } from 'node:buffer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workbook } from 'exceljs';
import { Brackets, ObjectLiteral, Repository } from 'typeorm';
import { CatalogQueryDto } from '../catalogs/dto/catalog-query.dto';
import { Barrio } from './entities/barrio.entity';
import { Canton } from './entities/canton.entity';
import { District } from './entities/district.entity';
import { Province } from './entities/province.entity';
import { CreateBarrioDto } from './dto/create-barrio.dto';
import { CreateCantonDto } from './dto/create-canton.dto';
import { CreateDistrictDto } from './dto/create-district.dto';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateBarrioDto } from './dto/update-barrio.dto';
import { UpdateCantonDto } from './dto/update-canton.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { CantonQueryDto } from './dto/canton-query.dto';
import { DistrictQueryDto } from './dto/district-query.dto';
import { BarrioQueryDto } from './dto/barrio-query.dto';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

type ImportMode = 'append' | 'replace';

type GeoFieldType = 'string' | 'int';

interface GeoFieldDefinition {
  name: string;
  type: GeoFieldType;
  required?: boolean;
  excelKeys: string[];
}

interface ExcelParseResult<T> {
  rows: Array<{ data: T; rowNumber: number }>;
  errors: Array<{ row: number; message: string }>;
}

export interface GeoImportResult<T> {
  imported: number;
  rows: T[];
  errors: Array<{ row: number; message: string }>;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(Province)
    private readonly provincesRepository: Repository<Province>,
    @InjectRepository(Canton)
    private readonly cantonsRepository: Repository<Canton>,
    @InjectRepository(District)
    private readonly districtsRepository: Repository<District>,
    @InjectRepository(Barrio)
    private readonly barriosRepository: Repository<Barrio>,
  ) {}

  async listProvinces(
    query: CatalogQueryDto,
  ): Promise<PaginatedResult<Province>> {
    const [data, meta] = await this.buildPagedQuery(
      this.provincesRepository,
      'province',
      query,
      ['nombre', 'codigo'],
      (qb) => qb.orderBy('province.codigo', 'ASC'),
    );
    return { data, meta };
  }

  async getProvince(id: string): Promise<Province> {
    const province = await this.provincesRepository.findOne({
      where: { id },
    });
    if (!province) {
      throw new NotFoundException(`provincia con id "${id}" no encontrada`);
    }
    return province;
  }

  async createProvince(dto: CreateProvinceDto): Promise<Province> {
    const province = this.provincesRepository.create(dto);
    return this.provincesRepository.save(province);
  }

  async updateProvince(
    id: string,
    dto: UpdateProvinceDto,
  ): Promise<Province> {
    const province = await this.getProvince(id);
    const merged = this.provincesRepository.merge(province, dto);
    return this.provincesRepository.save(merged);
  }

  async deleteProvince(id: string): Promise<void> {
    const result = await this.provincesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`provincia con id "${id}" no encontrada`);
    }
  }

  async importProvincesFromExcel(
    buffer: Buffer,
    mode: ImportMode,
  ): Promise<GeoImportResult<CreateProvinceDto>> {
    const parsed = await this.parseExcel<CreateProvinceDto>(buffer, [
      {
        name: 'nombre',
        type: 'string',
        required: true,
        excelKeys: ['provincia', 'nombre'],
      },
      {
        name: 'codigo',
        type: 'int',
        required: true,
        excelKeys: ['codigo'],
      },
    ]);

    const errors = [...parsed.errors];
    const deduped = this.deduplicateRecords(parsed.rows, ['codigo']);

    if (deduped.duplicates > 0) {
      errors.push({
        row: 0,
        message:
          'Se detectaron filas duplicadas para el mismo código de provincia. Se conservó la última aparición.',
      });
    }

    const values = deduped.records;

    if (values.length > 0) {
      if (mode === 'replace') {
        await this.provincesRepository.createQueryBuilder().delete().execute();
      }
      await this.provincesRepository.upsert(values, ['codigo']);
    }

    return {
      imported: values.length,
      rows: values,
      errors,
    };
  }

  async listCantons(query: CantonQueryDto): Promise<PaginatedResult<Canton>> {
    const [data, meta] = await this.buildPagedQuery(
      this.cantonsRepository,
      'canton',
      query,
      ['nombre', 'provincia', 'codigoCanton', 'codigoProvincia'],
      (qb) => {
        if (query.codigoProvincia) {
          qb.andWhere('canton.codigoProvincia = :codigoProvincia', {
            codigoProvincia: query.codigoProvincia,
          });
        }
        qb.orderBy('canton.codigoProvincia', 'ASC').addOrderBy(
          'canton.codigo',
          'ASC',
        );
      },
    );
    return { data, meta };
  }

  async getCanton(id: string): Promise<Canton> {
    const canton = await this.cantonsRepository.findOne({ where: { id } });
    if (!canton) {
      throw new NotFoundException(`Cantón con id "${id}" no encontrado`);
    }
    return canton;
  }

  async createCanton(dto: CreateCantonDto): Promise<Canton> {
    const province = await this.findProvinceByCode(dto.codigoProvincia);
    if (!province) {
      throw new NotFoundException(
        `No se encontró la provincia código ${dto.codigoProvincia}`,
      );
    }

    const canton = this.cantonsRepository.create({
      ...dto,
      provincia: province.nombre,
    });
    return this.cantonsRepository.save(canton);
  }

  async updateCanton(id: string, dto: UpdateCantonDto): Promise<Canton> {
    const canton = await this.getCanton(id);

    if (dto.codigoProvincia) {
      const province = await this.findProvinceByCode(dto.codigoProvincia);
      if (!province) {
        throw new NotFoundException(
          `No se encontró la provincia código ${dto.codigoProvincia}`,
        );
      }
      canton.provincia = province.nombre;
    }

    const merged = this.cantonsRepository.merge(canton, dto);
    return this.cantonsRepository.save(merged);
  }

  async deleteCanton(id: string): Promise<void> {
    const result = await this.cantonsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Cantón con id "${id}" no encontrado`);
    }
  }

  async importCantonsFromExcel(
    buffer: Buffer,
    mode: ImportMode,
  ): Promise<GeoImportResult<CreateCantonDto>> {
    const parsed = await this.parseExcel<CreateCantonDto>(buffer, [
      {
        name: 'provincia',
        type: 'string',
        required: true,
        excelKeys: ['provincia'],
      },
      {
        name: 'provinceCode',
        type: 'int',
        required: true,
        excelKeys: ['codigo', 'codigoprovincia'],
      },
      {
        name: 'nombre',
        type: 'string',
        required: true,
        excelKeys: ['canton', 'nombre'],
      },
      {
        name: 'codigo',
        type: 'int',
        required: true,
        excelKeys: ['codigo1', 'codigocanton'],
      },
    ]);

    const errors = [...parsed.errors];
    const validRows: Array<{ data: CreateCantonDto; rowNumber: number }> = [];

    for (const row of parsed.rows) {
      const province = await this.findProvinceByCode(row.data.codigoProvincia);
      if (!province) {
        errors.push({
          row: row.rowNumber,
          message: `provincia código ${row.data.codigoProvincia} inexistente`,
        });
        continue;
      }
      validRows.push({
        data: {
          ...row.data,
          provincia: province.nombre,
        },
        rowNumber: row.rowNumber,
      });
    }

    const deduped = this.deduplicateRecords(validRows, [
      'provinceCode',
      'codigo',
    ]);

    if (deduped.duplicates > 0) {
      errors.push({
        row: 0,
        message:
          'Se detectaron filas duplicadas para la combinación provincia/cantón. Se conservó la última aparición.',
      });
    }

    const values = deduped.records;

    if (values.length > 0) {
      if (mode === 'replace') {
        await this.cantonsRepository.createQueryBuilder().delete().execute();
      }
      await this.cantonsRepository.upsert(values, ['codigoProvincia', 'codigoCanton']);
    }

    return {
      imported: values.length,
      rows: values,
      errors,
    };
  }

  async listDistricts(
    query: DistrictQueryDto,
  ): Promise<PaginatedResult<District>> {
    const [data, meta] = await this.buildPagedQuery(
      this.districtsRepository,
      'district',
      query,
      ['nombre', 'canton', 'provincia', 'codigoDistrito', 'codigoProvincia', 'codigoCanton'],
      (qb) => {
        if (query.codigoProvincia) {
          qb.andWhere('district.codigoProvincia = :codigoProvincia', {
            codigoProvincia: query.codigoProvincia,
          });
        }
        if (query.codigoCanton) {
          qb.andWhere('district.codigoCanton = :codigoCanton', {
            codigoCanton: query.codigoCanton,
          });
        }
        qb
          .orderBy('district.codigoProvincia', 'ASC')
          .addOrderBy('district.codigoCanton', 'ASC')
          .addOrderBy('district.codigoDistrito', 'ASC');
      },
    );
    return { data, meta };
  }

  async getDistrict(id: string): Promise<District> {
    const district = await this.districtsRepository.findOne({ where: { id } });
    if (!district) {
      throw new NotFoundException(`Distrito con id "${id}" no encontrado`);
    }
    return district;
  }

  async createDistrict(dto: CreateDistrictDto): Promise<District> {
    const canton = await this.findCantonByCode(
      dto.codigoProvincia,
      parseInt(dto.codigoCanton),
    );
    if (!canton) {
      throw new NotFoundException(
        `Cantón código ${dto.codigoCanton} de la provincia ${dto.codigoProvincia} inexistente`,
      );
    }

    const district = this.districtsRepository.create({
      codigoProvincia: dto.codigoProvincia,
      codigoCanton: dto.codigoCanton,
      codigoDistrito: dto.codigoDistrito,
      provincia: canton.provincia,
      cantonName: canton.canton,
      distritoName: dto.distrito,
    });
    return this.districtsRepository.save(district);
  }

  async updateDistrict(
    id: string,
    dto: UpdateDistrictDto,
  ): Promise<District> {
    const district = await this.getDistrict(id);

    if (dto.codigoProvincia || dto.codigoCanton) {
      const provinceCode = dto.codigoProvincia ?? district.codigoProvincia;
      const cantonCode = dto.codigoCanton ? parseInt(dto.codigoCanton) : parseInt(district.codigoCanton);
      const canton = await this.findCantonByCode(provinceCode, cantonCode);
      if (!canton) {
        throw new NotFoundException(
          `Cantón código ${cantonCode} de la provincia ${provinceCode} inexistente`,
        );
      }
      district.codigoProvincia = provinceCode;
      district.codigoCanton = cantonCode.toString();
      district.provincia = canton.provincia;
      district.cantonName = canton.canton;
    }

    const merged = this.districtsRepository.merge(district, dto);
    return this.districtsRepository.save(merged);
  }

  async deleteDistrict(id: string): Promise<void> {
    const result = await this.districtsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Distrito con id "${id}" no encontrado`);
    }
  }

  async importDistrictsFromExcel(
    buffer: Buffer,
    mode: ImportMode,
  ): Promise<GeoImportResult<CreateDistrictDto>> {
    const parsed = await this.parseExcel<CreateDistrictDto>(buffer, [
      {
        name: 'provincia',
        type: 'string',
        required: true,
        excelKeys: ['provincia'],
      },
      {
        name: 'provinceCode',
        type: 'int',
        required: true,
        excelKeys: ['codigo', 'codigoprovincia'],
      },
      {
        name: 'canton',
        type: 'string',
        required: true,
        excelKeys: ['canton'],
      },
      {
        name: 'cantonCode',
        type: 'int',
        required: true,
        excelKeys: ['codigo1', 'codigocanton'],
      },
      {
        name: 'nombre',
        type: 'string',
        required: true,
        excelKeys: ['distrito'],
      },
      {
        name: 'codigo',
        type: 'int',
        required: true,
        excelKeys: ['codigo2', 'codigodistrito'],
      },
    ]);

    const errors = [...parsed.errors];
    const validRows: Array<{ data: CreateDistrictDto; rowNumber: number }> = [];

    for (const row of parsed.rows) {
      const canton = await this.findCantonByCode(
        row.data.codigoProvincia,
        parseInt(row.data.codigoCanton),
      );
      if (!canton) {
        errors.push({
          row: row.rowNumber,
          message: `Cantón código ${row.data.codigoCanton} inexistente para provincia ${row.data.codigoProvincia}`,
        });
        continue;
      }
      validRows.push({
        data: {
          ...row.data,
          provincia: canton.provincia,
          canton: canton.canton,
        },
        rowNumber: row.rowNumber,
      });
    }

    const deduped = this.deduplicateRecords(validRows, [
      'provinceCode',
      'cantonCode',
      'codigo',
    ]);

    if (deduped.duplicates > 0) {
      errors.push({
        row: 0,
        message:
          'Se detectaron filas duplicadas para la combinación provincia/cantón/distrito. Se conservó la última aparición.',
      });
    }

    const values = deduped.records.map(record => ({
      codigoProvincia: record.codigoProvincia,
      codigoCanton: record.codigoCanton,
      codigoDistrito: record.codigoDistrito,
      provincia: record.provincia,
      cantonName: record.canton,
      distritoName: record.distrito,
    }));

    if (values.length > 0) {
      if (mode === 'replace') {
        await this.districtsRepository.createQueryBuilder().delete().execute();
      }
      await this.districtsRepository.upsert(values, [
        'codigoProvincia',
        'codigoCanton',
        'codigoDistrito',
      ]);
    }

    return {
      imported: values.length,
      rows: values,
      errors,
    };
  }

  async listBarrios(
    query: BarrioQueryDto,
  ): Promise<PaginatedResult<Barrio>> {
    const [data, meta] = await this.buildPagedQuery(
      this.barriosRepository,
      'barrio',
      query,
      [
        'barrio',
        'distrito',
        'provincia',
        'cantonName',
        'codigoProvincia',
        'codigoCanton',
        'codigoDistrito',
      ],
      (qb) => {
        if (query.codigoProvincia) {
          qb.andWhere('barrio.codigoProvincia = :codigoProvincia', {
            codigoProvincia: query.codigoProvincia,
          });
        }
        if (query.codigoCanton) {
          qb.andWhere('barrio.codigoCanton = :codigoCanton', {
            codigoCanton: query.codigoCanton,
          });
        }
        if (query.distrito) {
          qb.andWhere('LOWER(barrio.distritoName) = :distrito', {
            distrito: this.normaliseSearch(query.distrito),
          });
        }
        if (query.provinceKey) {
          qb.andWhere('barrio.provinceKey = :provinceKey', {
            provinceKey: query.provinceKey,
          });
        }
        qb
          .orderBy('barrio.codigoProvincia', 'ASC')
          .addOrderBy('barrio.codigoCanton', 'ASC')
          .addOrderBy('barrio.districtName', 'ASC')
          .addOrderBy('barrio.nombre', 'ASC');
      },
    );
    return { data, meta };
  }

  async getBarrio(id: string): Promise<Barrio> {
    const barrio = await this.barriosRepository.findOne({ where: { id } });
    if (!barrio) {
      throw new NotFoundException(`Barrio con id "${id}" no encontrado`);
    }
    return barrio;
  }

  async createBarrio(dto: CreateBarrioDto): Promise<Barrio> {
    const enriched = await this.enrichBarrioPayload(dto);
    const barrio = this.barriosRepository.create({
      codigoProvincia: enriched.codigoProvincia,
      codigoCanton: enriched.codigoCanton,
      codigoDistrito: enriched.codigoDistrito,
      provincia: enriched.provincia,
      cantonName: enriched.canton,
      distritoName: enriched.distrito,
      barrio: enriched.barrio,
      provinceKey: enriched.provinceKey,
    });
    return this.barriosRepository.save(barrio);
  }

  async updateBarrio(
    id: string,
    dto: UpdateBarrioDto,
  ): Promise<Barrio> {
    const barrio = await this.getBarrio(id);
    const enriched = await this.enrichBarrioPayload({
      provincia: dto.provincia ?? barrio.provincia,
      codigoProvincia: dto.codigoProvincia ?? barrio.codigoProvincia,
      canton: dto.canton ?? barrio.cantonName,
      codigoCanton: dto.codigoCanton ?? barrio.codigoCanton,
      distrito: dto.distrito ?? barrio.distritoName,
      codigoDistrito: dto.codigoDistrito ?? barrio.codigoDistrito ?? undefined,
      barrio: dto.barrio ?? barrio.barrio,
    });

    const barrioData = {
      codigoProvincia: enriched.codigoProvincia,
      codigoCanton: enriched.codigoCanton,
      codigoDistrito: enriched.codigoDistrito,
      provincia: enriched.provincia,
      cantonName: enriched.canton,
      distritoName: enriched.distrito,
      barrio: enriched.barrio,
      provinceKey: enriched.provinceKey,
    };

    const merged = this.barriosRepository.merge(barrio, barrioData);
    return this.barriosRepository.save(merged);
  }

  async deleteBarrio(id: string): Promise<void> {
    const result = await this.barriosRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Barrio con id "${id}" no encontrado`);
    }
  }

  async importBarriosFromExcel(
    buffer: Buffer,
    mode: ImportMode,
  ): Promise<GeoImportResult<CreateBarrioDto>> {
    const parsed = await this.parseExcel<CreateBarrioDto>(buffer, [
      {
        name: 'provincia',
        type: 'string',
        required: true,
        excelKeys: ['provincia'],
      },
      {
        name: 'provinceCode',
        type: 'int',
        required: true,
        excelKeys: ['codigo', 'codigoprovincia'],
      },
      {
        name: 'canton',
        type: 'string',
        required: true,
        excelKeys: ['canton'],
      },
      {
        name: 'cantonCode',
        type: 'int',
        required: true,
        excelKeys: ['codigo1', 'codigocanton'],
      },
      {
        name: 'distrito',
        type: 'string',
        required: true,
        excelKeys: ['distrito'],
      },
      {
        name: 'barrio',
        type: 'string',
        required: true,
        excelKeys: ['barrio', 'nombre'],
      },
    ]);

    const errors = [...parsed.errors];
    const validRows: Array<{
      data: CreateBarrioDto & { provinceKey: string };
      rowNumber: number;
    }> = [];

    for (const row of parsed.rows) {
      try {
        const enriched = await this.enrichBarrioPayload(row.data);
        validRows.push({
          data: enriched,
          rowNumber: row.rowNumber,
        });
      } catch (error: any) {
        errors.push({
          row: row.rowNumber,
          message: error.message ?? 'Barrio inválido',
        });
      }
    }

    const deduped = this.deduplicateRecords(validRows, [
      'provinceCode',
      'cantonCode',
      'districtName',
      'nombre',
    ]);

    if (deduped.duplicates > 0) {
      errors.push({
        row: 0,
        message:
          'Se detectaron filas duplicadas para la combinación provincia/cantón/distrito/barrio. Se conservó la última aparición.',
      });
    }

    const values = deduped.records.map(record => ({
      codigoProvincia: record.codigoProvincia,
      codigoCanton: record.codigoCanton,
      codigoDistrito: record.codigoDistrito,
      provincia: record.provincia,
      cantonName: record.canton,
      distritoName: record.distrito,
      barrio: record.barrio,
      provinceKey: record.provinceKey,
    }));

    if (values.length > 0) {
      if (mode === 'replace') {
        await this.barriosRepository.createQueryBuilder().delete().execute();
      }
      await this.barriosRepository.upsert(values, [
        'codigoProvincia',
        'codigoCanton',
        'codigoDistrito',
        'barrio',
      ]);
    }

    const responseRows = values.map(({ provinceKey, ...row }) => row as CreateBarrioDto);

    return {
      imported: values.length,
      rows: responseRows,
      errors,
    };
  }

  private async enrichBarrioPayload(
    dto: CreateBarrioDto,
  ): Promise<CreateBarrioDto & { provinceKey: string }> {
    const province = await this.findProvinceByCode(dto.codigoProvincia);
    if (!province) {
      throw new NotFoundException(
        `provincia código ${dto.codigoProvincia} inexistente`,
      );
    }

    const canton = await this.findCantonByCode(dto.codigoProvincia, parseInt(dto.codigoCanton));
    if (!canton) {
      throw new NotFoundException(
        `Cantón código ${dto.codigoCanton} inexistente en provincia ${dto.codigoProvincia}`,
      );
    }

    const district =
      (await this.findDistrictByCodes(
        dto.codigoProvincia,
        parseInt(dto.codigoCanton),
        dto.codigoDistrito ? parseInt(dto.codigoDistrito) : null,
      )) ??
      (await this.findDistrictByName(
        dto.codigoProvincia,
        parseInt(dto.codigoCanton),
        dto.distrito,
      ));

    if (!district) {
      throw new NotFoundException(
        `Distrito "${dto.distrito}" inexistente en cantón ${dto.codigoCanton}`,
      );
    }

    return {
      ...dto,
      provincia: province.nombre,
      canton: canton.canton,
      distrito: district.distritoName,
      codigoDistrito: district.codigoDistrito,
      provinceKey: this.buildProvinceKey(province.nombre),
    };
  }

  private async findProvinceByCode(
    codigo: number,
  ): Promise<Province | null> {
    return this.provincesRepository.findOne({
      where: { codigo },
    });
  }

  private async findCantonByCode(
    provinceCode: number,
    cantonCode: number,
  ): Promise<Canton | null> {
    return this.cantonsRepository.findOne({
      where: { codigoProvincia: provinceCode, codigoCanton: cantonCode.toString() },
    });
  }

  private async findDistrictByCodes(
    provinceCode: number,
    cantonCode: number,
    districtCode: number | null,
  ): Promise<District | null> {
    if (!districtCode) {
      return null;
    }
    return this.districtsRepository.findOne({
      where: {
        codigoProvincia: provinceCode,
        codigoCanton: cantonCode.toString(),
        codigoDistrito: districtCode.toString(),
      },
    });
  }

  private async findDistrictByName(
    provinceCode: number,
    cantonCode: number,
    districtName: string,
  ): Promise<District | null> {
    return this.districtsRepository.findOne({
      where: {
        codigoProvincia: provinceCode,
        codigoCanton: cantonCode.toString(),
        distritoName: districtName,
      },
    });
  }

  private buildProvinceKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async buildPagedQuery<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    query: CatalogQueryDto,
    searchFields: string[],
    configure?: (qb: any) => void,
  ): Promise<[T[], PaginationMeta]> {
    const page = query.page ?? 1;
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const qb = repository.createQueryBuilder(alias);

    if (query.search && searchFields.length > 0) {
      const trimmedSearch = query.search.trim();
      if (trimmedSearch) {
        const escapedTerm = this.escapeLikeSearch(trimmedSearch);
        const likePattern = `%${escapedTerm}%`;
        qb.andWhere(
          new Brackets((where) => {
            searchFields.forEach((field, index) => {
              const paramName = `search_${index}`;
              where.orWhere(
                `CAST(${alias}.${field} AS TEXT) ILIKE :${paramName} ESCAPE '\\'`,
                { [paramName]: likePattern },
              );
            });
          }),
        );
      }
    }

    if (configure) {
      configure(qb);
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return [
      data,
      {
        total,
        page,
        limit,
      },
    ];
  }

  private normaliseSearch(search: string): string {
    return search.trim().toLowerCase();
  }

  private escapeLikeSearch(term: string): string {
    return term.replace(/[%_\\]/g, (char) => `\\${char}`);
  }

  private deduplicateRecords<T extends Record<string, any>>(
    entries: Array<{ data: T; rowNumber?: number }>,
    uniqueKeys: string[],
  ): { records: T[]; duplicates: number } {
    if (uniqueKeys.length === 0) {
      return { records: entries.map((entry) => entry.data), duplicates: 0 };
    }

    const map = new Map<string, T>();
    let duplicates = 0;

    entries.forEach(({ data }) => {
      const key = uniqueKeys
        .map((uniqueKey) => JSON.stringify(data[uniqueKey] ?? null))
        .join('|');

      if (map.has(key)) {
        duplicates += 1;
      }

      map.set(key, data);
    });

    return { records: Array.from(map.values()), duplicates };
  }

  private async parseExcel<T extends Record<string, any>>(
    buffer: Buffer,
    fields: GeoFieldDefinition[],
  ): Promise<ExcelParseResult<T>> {
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
        'La primera fila debe contener encabezados',
      );
    }

    const columnMap = new Map<number, GeoFieldDefinition>();
    const fieldLookup = fields.reduce<Record<string, GeoFieldDefinition>>(
      (acc, field) => {
        const registerKey = (key: string) => {
          const normalized = this.normaliseHeader(key);
          if (!normalized || normalized in acc) {
            return;
          }
          acc[normalized] = field;
        };

        field.excelKeys.forEach(registerKey);
        registerKey(field.name);
        return acc;
      },
      {},
    );

    headerRow.eachCell({ includeEmpty: false }, (cell, column) => {
      const headerKey = this.normaliseHeader(cell.value);
      if (!headerKey) {
        return;
      }
      const field = fieldLookup[headerKey];
      if (field) {
        columnMap.set(column, field);
      }
    });

    const missingFields = fields.filter(
      (field) =>
        field.required &&
        !Array.from(columnMap.values()).includes(field),
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Faltan columnas requeridas: ${missingFields
          .map((field) => field.name)
          .join(', ')}`,
      );
    }

    const rows: Array<{ data: T; rowNumber: number }> = [];
    const errors: Array<{ row: number; message: string }> = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const record: Record<string, any> = {};
      let hasValue = false;

      columnMap.forEach((field, column) => {
        const cellValue = this.extractCellValue(row.getCell(column).value);
        if (
          cellValue !== null &&
          cellValue !== undefined &&
          cellValue !== ''
        ) {
          record[field.name] = cellValue;
          hasValue = true;
        }
      });

      if (!hasValue) {
        return;
      }

      try {
        const validated = this.validateGeoRecord(record, fields) as T;
        rows.push({ data: validated, rowNumber });
      } catch (error: any) {
        errors.push({
          row: rowNumber,
          message: error.message ?? 'Registro inválido',
        });
      }
    });

    return { rows, errors };
  }

  private validateGeoRecord(
    record: Record<string, any>,
    fields: GeoFieldDefinition[],
  ): Record<string, any> {
    const validated: Record<string, any> = {};
    const allowedFields = new Set(fields.map((field) => field.name));

    Object.keys(record).forEach((key) => {
      if (!allowedFields.has(key)) {
        throw new BadRequestException(`Campo desconocido "${key}"`);
      }
    });

    fields.forEach((field) => {
      const value = record[field.name];

      if (
        (value === undefined || value === null || value === '') &&
        field.required
      ) {
        throw new BadRequestException(
          `El campo "${field.name}" es obligatorio`,
        );
      }

      if (value === undefined || value === null || value === '') {
        return;
      }

      if (field.type === 'string') {
        validated[field.name] = String(value).trim();
        return;
      }

      const numeric = Number(
        String(value)
          .trim()
          .replace(/,/g, '.'),
      );
      if (Number.isNaN(numeric)) {
        throw new BadRequestException(
          `El campo "${field.name}" debe ser numérico`,
        );
      }
      validated[field.name] = Math.trunc(numeric);
    });

    return validated;
  }

  private extractCellValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object') {
      if ('text' in value && typeof (value as any).text === 'string') {
        return (value as any).text;
      }

      if ('result' in value && (value as any).result !== undefined) {
        return (value as any).result;
      }

      if (Array.isArray((value as any).richText)) {
        return (value as any).richText
          .map((segment: any) => segment?.text ?? '')
          .join('')
          .trim();
      }

      if ('hyperlink' in value && 'text' in value) {
        return String((value as any).text);
      }

      if ('formula' in value && (value as any).formula) {
        return (value as any).result ?? (value as any).formula;
      }

      if (typeof value.toString === 'function') {
        return value.toString();
      }
    }

    return value;
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
