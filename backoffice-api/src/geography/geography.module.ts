import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GeographyService } from './geography.service';
import { Province } from './entities/province.entity';
import { Canton } from './entities/canton.entity';
import { District } from './entities/district.entity';
import { Barrio } from './entities/barrio.entity';
import { ProvincesController } from './controllers/provinces.controller';
import { CantonsController } from './controllers/cantons.controller';
import { DistrictsController } from './controllers/districts.controller';
import { BarriosController } from './controllers/barrios.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Province, Canton, District, Barrio]),
    AuthModule,
  ],
  controllers: [
    ProvincesController,
    CantonsController,
    DistrictsController,
    BarriosController,
  ],
  providers: [GeographyService],
  exports: [GeographyService],
})
export class GeographyModule {}
