import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Canton } from './canton.entity';
import { Barrio } from './barrio.entity';

@Entity({ name: 'distritos' })
@Index('distritos_province_canton_idx', ['provinceCode', 'cantonCode'])
@Index(
  'distritos_province_canton_codigo_uq',
  ['provinceCode', 'cantonCode', 'codigo'],
  { unique: true },
)
export class District {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provincia_nombre', length: 120 })
  provinciaNombre!: string;

  @Column({ name: 'province_code', type: 'int' })
  provinceCode!: number;

  @Column({ name: 'canton_nombre', length: 120 })
  cantonNombre!: string;

  @Column({ name: 'canton_code', type: 'int' })
  cantonCode!: number;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: 'int' })
  codigo!: number;

  @ManyToOne(() => Canton, (canton) => canton.distritos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'province_code', referencedColumnName: 'provinceCode' },
    { name: 'canton_code', referencedColumnName: 'codigo' },
  ])
  canton!: Canton;

  @OneToMany(() => Barrio, (barrio) => barrio.distrito)
  barrios!: Barrio[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
