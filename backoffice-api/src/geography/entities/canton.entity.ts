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
@Index('cantones_codigo_provincia_idx', ['codigoProvincia'])
@Index('cantones_codigo_provincia_codigo_canton_uq', ['codigoProvincia', 'codigoCanton'], {
  unique: true,
})
export class Canton {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provincia', length: 120 })
  provincia!: string;

  @Column({ name: 'codigo_provincia', type: 'int' })
  codigoProvincia!: number;

  @Column({ name: 'canton', length: 120 })
  canton!: string;

  @Column({ name: 'codigo_canton', length: 50 })
  codigoCanton!: string;

  @ManyToOne(() => Province, (province) => province.cantones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'codigo_provincia',
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