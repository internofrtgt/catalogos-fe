import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiDocument } from './api-document.entity';
import { ApiDocsService } from './api-docs.service';
import { ApiDocsController } from './api-docs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiDocument])],
  controllers: [ApiDocsController],
  providers: [ApiDocsService],
  exports: [ApiDocsService],
})
export class ApiDocsModule {}
