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
import { Province } from './province.entity';
import { District } from './district.entity';

@Entity({ name: 'cantones' })
@Index('cantones_provincia_codigo_idx', ['provinceCode'])
@Index('cantones_provincia_codigo_codigo_uq', ['provinceCode', 'codigo'], {
  unique: true,
})
export class Canton {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provincia_nombre', length: 120 })
  provinciaNombre!: string;

  @Column({ name: 'province_code', type: 'int' })
  provinceCode!: number;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: 'int' })
  codigo!: number;

  @ManyToOne(() => Province, (province) => province.cantones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'province_code',
    referencedColumnName: 'codigo',
  })
  province!: Province;

  @OneToMany(() => District, (district) => district.canton)
  distritos!: District[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
