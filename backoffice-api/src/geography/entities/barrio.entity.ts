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
@Index('barrios_province_canton_idx', ['provinceCode', 'cantonCode'])
@Index(
  'barrios_province_canton_district_nombre_uq',
  ['provinceCode', 'cantonCode', 'districtName', 'nombre'],
  { unique: true },
)
export class Barrio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'province_key', length: 80 })
  provinceKey!: string;

  @Column({ name: 'provincia_nombre', length: 120 })
  provinciaNombre!: string;

  @Column({ name: 'province_code', type: 'int' })
  provinceCode!: number;

  @Column({ name: 'canton_nombre', length: 120 })
  cantonNombre!: string;

  @Column({ name: 'canton_code', type: 'int' })
  cantonCode!: number;

  @Column({ name: 'district_name', length: 120 })
  districtName!: string;

  @Column({ name: 'district_code', type: 'int', nullable: true })
  districtCode!: number | null;

  @Column({ length: 120 })
  nombre!: string;

  @ManyToOne(() => District, (district) => district.barrios, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn([
    { name: 'province_code', referencedColumnName: 'provinceCode' },
    { name: 'canton_code', referencedColumnName: 'cantonCode' },
    { name: 'district_code', referencedColumnName: 'codigo' },
  ])
  distrito!: District | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
