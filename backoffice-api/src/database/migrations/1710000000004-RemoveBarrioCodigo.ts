import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBarrioCodigo1710000000004 implements MigrationInterface {
  name = 'RemoveBarrioCodigo1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "barrios_province_canton_district_codigo_uq"',
    );
    await queryRunner.query('ALTER TABLE "barrios" DROP COLUMN "codigo"');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "barrios_province_canton_district_nombre_uq" ON "barrios" ("province_code", "canton_code", "district_name", "nombre")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "barrios_province_canton_district_nombre_uq"',
    );
    await queryRunner.query(
      'ALTER TABLE "barrios" ADD COLUMN "codigo" integer',
    );
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY province_code, canton_code, district_name
            ORDER BY nombre
          ) AS rn
        FROM "barrios"
      )
      UPDATE "barrios" b
      SET "codigo" = ranked.rn
      FROM ranked
      WHERE ranked.id = b.id
    `);
    await queryRunner.query(
      'ALTER TABLE "barrios" ALTER COLUMN "codigo" SET NOT NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "barrios_province_canton_district_codigo_uq" ON "barrios" ("province_code", "canton_code", "district_name", "codigo")',
    );
  }
}

