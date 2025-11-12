import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import {
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory,
} from '@nestjs/typeorm';
import { catalogEntitySchemas } from '../catalogs/catalog.definitions';
import { Barrio } from '../geography/entities/barrio.entity';
import { Canton } from '../geography/entities/canton.entity';
import { District } from '../geography/entities/district.entity';
import { Province } from '../geography/entities/province.entity';
import { User } from '../users/user.entity';
import { ApiDocument } from '../api-docs/api-document.entity';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // Try to use DATABASE_URL first (created by Vercel Neon)
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (databaseUrl) {
      console.log('Using DATABASE_URL from Vercel Neon');
      return {
        type: 'postgres',
        url: databaseUrl,
        entities: [
          ...catalogEntitySchemas,
          User,
          Province,
          Canton,
          District,
          Barrio,
          ApiDocument,
        ],
        synchronize:
          this.configService.get<string>('TYPEORM_SYNCHRONIZE', 'false') ===
          'true',
        migrationsRun:
          this.configService.get<string>('TYPEORM_RUN_MIGRATIONS', 'false') ===
          'true',
        migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
        logging: this.resolveLogging(isProduction),
        ssl: { rejectUnauthorized: false },
      };
    }

    // Fallback to individual variables
    console.log('Using individual database variables');
    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get<string>('DATABASE_USERNAME', 'postgres'),
      password: this.configService.get<string>('DATABASE_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DATABASE_NAME', 'backoffice'),
      entities: [
        ...catalogEntitySchemas,
        User,
        Province,
        Canton,
        District,
        Barrio,
        ApiDocument,
      ],
      synchronize:
        this.configService.get<string>('TYPEORM_SYNCHRONIZE', 'false') ===
        'true',
      migrationsRun:
        this.configService.get<string>('TYPEORM_RUN_MIGRATIONS', 'false') ===
        'true',
      migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
      logging: this.resolveLogging(isProduction),
      ssl: this.resolveSsl(),
    };
  }

  private resolveLogging(
    isProduction: boolean,
  ):
    | boolean
    | Array<'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration'> {
    const logging = this.configService.get<string>('TYPEORM_LOGGING');
    if (!logging) {
      return isProduction ? ['error'] : true;
    }

    if (logging === 'true') {
      return true;
    }

    if (logging === 'false') {
      return false;
    }

    return logging
      .split(',')
      .map((entry) => entry.trim()) as Array<
      'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration'
    >;
  }

  private resolveSsl(): boolean | { rejectUnauthorized: boolean } {
    const ssl = this.configService.get<string>('DATABASE_SSL', 'false');
    if (ssl === 'true') {
      const rejectUnauthorized =
        this.configService.get<string>(
          'DATABASE_SSL_REJECT_UNAUTHORIZED',
          'false',
        ) === 'true';
      return { rejectUnauthorized };
    }
    return false;
  }
}
