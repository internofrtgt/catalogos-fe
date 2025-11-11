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
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeographyService, GeoImportResult } from '../geography.service';
import { CatalogQueryDto } from '../../catalogs/dto/catalog-query.dto';
import { CreateProvinceDto } from '../dto/create-province.dto';
import { UpdateProvinceDto } from '../dto/update-province.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';

@ApiTags('Geografia - Provincias')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geography/provinces')
export class ProvincesController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get()
  list(@Query() query: CatalogQueryDto) {
    return this.geographyService.listProvinces(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geographyService.getProvince(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProvinceDto) {
    return this.geographyService.createProvince(dto);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.geographyService.updateProvince(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.geographyService.deleteProvince(id);
    return { success: true };
  }

  @Roles(UserRole.ADMIN)
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        mode: {
          type: 'string',
          enum: ['append', 'replace'],
          default: 'append',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  importFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode: 'append' | 'replace' = 'append',
  ): Promise<GeoImportResult<CreateProvinceDto>> {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel');
    }
    const importMode = mode === 'replace' ? 'replace' : 'append';
    return this.geographyService.importProvincesFromExcel(
      file.buffer,
      importMode,
    );
  }
}
