import {
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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeographyService, GeoImportResult } from '../geography.service';
import { CreateCantonDto } from '../dto/create-canton.dto';
import { UpdateCantonDto } from '../dto/update-canton.dto';
import { CantonQueryDto } from '../dto/canton-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';

@ApiTags('Geografia - Cantones')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geography/cantons')
export class CantonsController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get()
  list(@Query() query: CantonQueryDto) {
    return this.geographyService.listCantons(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.geographyService.getCanton(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateCantonDto) {
    return this.geographyService.createCanton(dto);
  }

  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCantonDto,
  ) {
    return this.geographyService.updateCanton(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.geographyService.deleteCanton(id);
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
  ): Promise<GeoImportResult<CreateCantonDto>> {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo Excel');
    }
    const importMode = mode === 'replace' ? 'replace' : 'append';
    return this.geographyService.importCantonsFromExcel(
      file.buffer,
      importMode,
    );
  }
}
