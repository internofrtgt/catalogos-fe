import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendCondicionesVentaDescription1710000000002
  implements MigrationInterface
{
  name = 'ExtendCondicionesVentaDescription1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "condiciones_venta" ALTER COLUMN "descripcion" TYPE varchar(1024)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "condiciones_venta" ALTER COLUMN "descripcion" TYPE varchar(180)`,
    );
  }
}
