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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiDocsService } from './api-docs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CreateApiDocumentDto } from './dto/create-api-document.dto';
import { UpdateApiDocumentDto } from './dto/update-api-document.dto';
import { ListApiDocsDto } from './dto/list-api-docs.dto';

@ApiTags('Documentacion API')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-docs')
export class ApiDocsController {
  constructor(private readonly apiDocsService: ApiDocsService) {}

  @Get()
  async findAll(@Query() query: ListApiDocsDto) {
    return this.apiDocsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiDocsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateApiDocumentDto) {
    return this.apiDocsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiDocumentDto,
  ) {
    return this.apiDocsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.apiDocsService.remove(id);
    return { success: true };
  }
}
