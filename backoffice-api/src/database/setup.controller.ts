import { Controller, Get, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppDataSource } from './typeorm.datasource';
import * as seed from '../seeds/seed';

@Controller('api/setup')
export class SetupController {
  @Post('migrate')
  async migrate() {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      await AppDataSource.runMigrations();

      return {
        success: true,
        message: 'Migrations completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Migration failed',
        error: error.message
      };
    }
  }

  @Post('seed')
  async runSeed() {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      // Run seed function
      await seed.seed();

      return {
        success: true,
        message: 'Seed completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Seed failed',
        error: error.message
      };
    }
  }

  @Get('status')
  async status() {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const migrations = await AppDataSource.query(
        'SELECT * FROM migrations ORDER BY id DESC LIMIT 5'
      );

      return {
        success: true,
        database: 'connected',
        migrations: migrations.length,
        lastMigrations: migrations
      };
    } catch (error) {
      return {
        success: false,
        message: 'Status check failed',
        error: error.message
      };
    }
  }
}