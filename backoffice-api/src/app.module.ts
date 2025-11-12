import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { GeographyModule } from './geography/geography.module';
import { UsersModule } from './users/users.module';
import { ApiDocsModule } from './api-docs/api-docs.module';
import { SetupController } from './database/setup.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    AuthModule,
    UsersModule,
    ApiDocsModule,
    CatalogsModule,
    GeographyModule,
  ],
  providers: [TypeOrmConfigService],
  controllers: [SetupController],
})
export class AppModule {}
