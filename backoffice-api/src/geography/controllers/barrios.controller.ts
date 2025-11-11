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
import { CreateBarrioDto } from '../dto/create-barrio.dto';
import { UpdateBarrioDto } from '../dto/update-barrio.dto';
import { BarrioQueryDto } from '../dto/barrio-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';

@ApiTags('Geografía - Barrios')
@ApiBearerAuth('JWT')
@ApiTags('Geografia - Barrios')
@Controller('geography/barrios')
export class BarriosController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get()
  list(@Query() query: BarrioQueryDto) {
    return this.geographyService.listBarrios(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geographyService.getBarrio(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateBarrioDto) {
    return this.geographyService.createBarrio(dto);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarrioDto,
  ) {
    return this.geographyService.updateBarrio(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.geographyService.deleteBarrio(id);
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
    FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  importFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode: 'append' | 'replace' = 'append',
  ): Promise<GeoImportResult<CreateBarrioDto>> {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel');
    }
    const importMode = mode === 'replace' ? 'replace' : 'append';
    return this.geographyService.importBarriosFromExcel(
      file.buffer,
      importMode,
    );
  }
}
