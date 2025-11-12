import { Controller, Get, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppDataSource } from './typeorm.datasource';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('api/setup')
export class SetupController {
  constructor(private configService: ConfigService) {}

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
  async createAdminUser() {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const userRepository = AppDataSource.getRepository(User);

      const username = this.configService.get<string>('DEFAULT_ADMIN_USERNAME', 'admin');
      const password = this.configService.get<string>('DEFAULT_ADMIN_PASSWORD', 'ChangeMe123!');

      // Check if admin user already exists
      let existingUser = await userRepository.findOne({
        where: { username: username.toLowerCase() }
      });

      if (existingUser) {
        return {
          success: true,
          message: 'Admin user already exists',
          user: {
            username: existingUser.username,
            role: existingUser.role
          }
        };
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      const adminUser = userRepository.create({
        username: username.toLowerCase(),
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      });

      await userRepository.save(adminUser);

      return {
        success: true,
        message: 'Admin user created successfully',
        user: {
          username: adminUser.username,
          role: adminUser.role
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Admin user creation failed',
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

      // Check admin user
      const userRepository = AppDataSource.getRepository(User);
      const adminUser = await userRepository.findOne({
        where: { role: 'ADMIN' }
      });

      return {
        success: true,
        database: 'connected',
        migrations: migrations.length,
        lastMigrations: migrations,
        adminUser: adminUser ? {
          username: adminUser.username,
          role: adminUser.role
        } : null
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