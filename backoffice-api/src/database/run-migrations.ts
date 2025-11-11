import { AppDataSource } from './typeorm.datasource';

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    // eslint-disable-next-line no-console
    console.log('✅ Migrations executed successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Migration execution failed', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runMigrations();
