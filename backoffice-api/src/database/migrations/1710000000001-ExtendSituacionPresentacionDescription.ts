import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendSituacionPresentacionDescription1710000000001
  implements MigrationInterface
{
  name = 'ExtendSituacionPresentacionDescription1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "situaciones_presentacion" ALTER COLUMN "descripcion" TYPE varchar(1024)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "situaciones_presentacion" ALTER COLUMN "descripcion" TYPE varchar(180)`,
    );
  }
}
