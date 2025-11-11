import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { catalogEntitySchemas } from '../catalogs/catalog.definitions';
import { User } from '../users/user.entity';
import { Province } from '../geography/entities/province.entity';
import { Canton } from '../geography/entities/canton.entity';
import { District } from '../geography/entities/district.entity';
import { Barrio } from '../geography/entities/barrio.entity';
import { ApiDocument } from '../api-docs/api-document.entity';

config({ path: '.env' });

const ssl =
  process.env.DATABASE_SSL === 'true'
    ? {
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
      }
    : false;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'backoffice',
  entities: [
    ...catalogEntitySchemas,
    User,
    Province,
    Canton,
    District,
    Barrio,
    ApiDocument,
  ],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: parseLogging(),
  ssl,
});

function parseLogging():
  | boolean
  | Array<'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration'> {
  const logging = process.env.TYPEORM_LOGGING;

  if (!logging) {
    return false;
  }

  if (logging === 'true') {
    return true;
  }

  if (logging === 'false') {
    return false;
  }

  return logging
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => !!entry) as Array<
    'query' | 'error' | 'schema' | 'warn' | 'info' | 'log' | 'migration'
  >;
}
