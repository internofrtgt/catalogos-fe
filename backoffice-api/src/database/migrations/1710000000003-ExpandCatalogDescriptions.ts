import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCatalogDescriptions1710000000003
  implements MigrationInterface
{
  name = 'ExpandCatalogDescriptions1710000000003';

  private readonly targets: Array<{ table: string; column: string }> = [
    { table: 'tipos_documento', column: 'descripcion' },
    { table: 'situaciones_presentacion', column: 'descripcion' },
    { table: 'actividades_economicas', column: 'nombre' },
    { table: 'condiciones_venta', column: 'descripcion' },
    { table: 'tipos_identificacion', column: 'descripcion' },
    { table: 'formas_farmaceuticas', column: 'descripcion' },
    { table: 'tipos_codigo_ps', column: 'descripcion' },
    { table: 'tipos_transaccion', column: 'descripcion' },
    { table: 'tipos_descuento', column: 'descripcion' },
    { table: 'tipos_impuestos', column: 'descripcion' },
    { table: 'tarifas_iva', column: 'descripcion' },
    { table: 'tipos_documento_exoneracion', column: 'descripcion' },
    { table: 'instituciones_exoneracion', column: 'descripcion' },
    { table: 'tipos_otros_cargos', column: 'descripcion' },
    { table: 'medios_pago', column: 'descripcion' },
    { table: 'tipos_documento_referencia', column: 'descripcion' },
    { table: 'codigos_referencia', column: 'descripcion' },
    { table: 'mensajes_recepcion', column: 'descripcion' },
    { table: 'condiciones_impuesto', column: 'descripcion' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.targets) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE varchar(1024)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.targets) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE varchar(180)`,
      );
    }
  }
}
