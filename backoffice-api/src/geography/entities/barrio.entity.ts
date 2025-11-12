import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { District } from './district.entity';

@Entity({ name: 'barrios' })
@Index('barrios_codigo_provincia_codigo_canton_idx', ['codigoProvincia', 'codigoCanton'])
@Index(
  'barrios_codigo_provincia_codigo_canton_codigo_distrito_barrio_uq',
  ['codigoProvincia', 'codigoCanton', 'codigoDistrito', 'barrio'],
  { unique: true },
)
export class Barrio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'province_key', length: 80 })
  provinceKey!: string;

  @Column({ name: 'provincia', length: 120 })
  provincia!: string;

  @Column({ name: 'codigo_provincia', type: 'int' })
  codigoProvincia!: number;

  @Column({ name: 'canton', length: 120 })
  cantonName!: string;

  @Column({ name: 'codigo_canton', length: 50 })
  codigoCanton!: string;

  @Column({ name: 'distrito', length: 120 })
  distritoName!: string;

  @Column({ name: 'codigo_distrito', length: 50 })
  codigoDistrito!: string;

  @Column({ name: 'barrio', length: 120 })
  barrio!: string;

  @ManyToOne(() => District, (district) => district.barrios, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn([
    { name: 'codigo_provincia', referencedColumnName: 'codigoProvincia' },
    { name: 'codigo_canton', referencedColumnName: 'codigoCanton' },
    { name: 'codigo_distrito', referencedColumnName: 'codigoDistrito' },
  ])
  distrito!: District | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}