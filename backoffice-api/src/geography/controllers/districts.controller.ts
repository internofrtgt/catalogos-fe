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
import { CreateDistrictDto } from '../dto/create-district.dto';
import { UpdateDistrictDto } from '../dto/update-district.dto';
import { DistrictQueryDto } from '../dto/district-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';

@ApiTags('Geografía - Distritos')
@ApiBearerAuth('JWT')
@ApiTags('Geografia - Distritos')
@Controller('geography/districts')
export class DistrictsController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get()
  list(@Query() query: DistrictQueryDto) {
    return this.geographyService.listDistricts(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geographyService.getDistrict(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateDistrictDto) {
    return this.geographyService.createDistrict(dto);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistrictDto,
  ) {
    return this.geographyService.updateDistrict(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.geographyService.deleteDistrict(id);
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
  ): Promise<GeoImportResult<CreateDistrictDto>> {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel');
    }
    const importMode = mode === 'replace' ? 'replace' : 'append';
    return this.geographyService.importDistrictsFromExcel(
      file.buffer,
      importMode,
    );
  }
}
