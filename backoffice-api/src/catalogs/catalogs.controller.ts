import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogsService } from './catalogs.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Catalogos')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  async listCatalogs() {
    return this.catalogsService.listDefinitions();
  }

  @Get(':catalogKey')
  async findAll(
    @Param('catalogKey') catalogKey: string,
    @Query() query: CatalogQueryDto,
  ) {
    return this.catalogsService.findAll(catalogKey, query);
  }

  @Get(':catalogKey/:id')
  async findOne(
    @Param('catalogKey') catalogKey: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogsService.findOne(catalogKey, id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':catalogKey')
  async create(
    @Param('catalogKey') catalogKey: string,
    @Body() body: Record<string, any>,
  ) {
    return this.catalogsService.create(catalogKey, body);
  }

  @Roles(UserRole.ADMIN)
  @Put(':catalogKey/:id')
  async update(
    @Param('catalogKey') catalogKey: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.catalogsService.update(catalogKey, id, body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':catalogKey/:id')
  async remove(
    @Param('catalogKey') catalogKey: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.catalogsService.remove(catalogKey, id);
    return { success: true };
  }

  @Roles(UserRole.ADMIN)
  @Post(':catalogKey/import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        mode: {
          type: 'string',
          enum: ['append', 'replace'],
          default: 'append',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importFromExcel(
    @Param('catalogKey') catalogKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode: 'append' | 'replace' = 'append',
  ) {
    if (!file) {
      throw new BadRequestException(
        'Se requiere un archivo Excel para importar',
      );
    }
    const importMode = mode === 'replace' ? 'replace' : 'append';
    return this.catalogsService.importFromExcel(catalogKey, file.buffer, importMode);
  }
}
