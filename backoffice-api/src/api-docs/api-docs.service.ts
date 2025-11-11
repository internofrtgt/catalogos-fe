import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiDocument } from './api-document.entity';
import { CreateApiDocumentDto } from './dto/create-api-document.dto';
import { UpdateApiDocumentDto } from './dto/update-api-document.dto';
import { ListApiDocsDto } from './dto/list-api-docs.dto';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ListResult {
  data: ApiDocument[];
  meta: PaginationMeta;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ApiDocsService {
  constructor(
    @InjectRepository(ApiDocument)
    private readonly docsRepository: Repository<ApiDocument>,
  ) {}

  async create(dto: CreateApiDocumentDto): Promise<ApiDocument> {
    const entity = this.docsRepository.create(dto);
    return this.docsRepository.save(entity);
  }

  async findAll(params: ListApiDocsDto): Promise<ListResult> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const qb = this.docsRepository.createQueryBuilder('doc');

    if (params.search) {
      const term = params.search.trim().toLowerCase();
      qb.where('LOWER(doc.title) LIKE :term', { term: `%${term}%` })
        .orWhere('LOWER(doc.version) LIKE :term', { term: `%${term}%` });
    }

    qb
      .orderBy('doc.updatedAt', 'DESC')
      .addOrderBy('doc.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string): Promise<ApiDocument> {
    const doc = await this.docsRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(
        `No se encontro la documentacion con id "${id}"`,
      );
    }
    return doc;
  }

  async update(
    id: string,
    dto: UpdateApiDocumentDto,
  ): Promise<ApiDocument> {
    const doc = await this.findOne(id);
    Object.assign(doc, dto);
    return this.docsRepository.save(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findOne(id);
    await this.docsRepository.remove(doc);
  }
}
