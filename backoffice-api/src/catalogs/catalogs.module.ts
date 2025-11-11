import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import {
  catalogDefinitions,
  catalogEntitySchemas,
} from './catalog.definitions';
import { CATALOG_DEFINITIONS } from './catalog.tokens';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(catalogEntitySchemas), AuthModule],
  controllers: [CatalogsController],
  providers: [
    CatalogsService,
    {
      provide: CATALOG_DEFINITIONS,
      useValue: catalogDefinitions,
    },
  ],
  exports: [CatalogsService],
})
export class CatalogsModule {}
