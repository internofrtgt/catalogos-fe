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
@Index('distritos_codigo_provincia_codigo_canton_idx', ['codigoProvincia', 'codigoCanton'])
@Index(
  'distritos_codigo_provincia_codigo_canton_codigo_distrito_uq',
  ['codigoProvincia', 'codigoCanton', 'codigoDistrito'],
  { unique: true },
)
export class District {
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

  @Column({ name: 'distrito', length: 120 })
  distrito!: string;

  @Column({ name: 'codigo_distrito', length: 50 })
  codigoDistrito!: string;

  @ManyToOne(() => Canton, (canton) => canton.distritos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'codigo_provincia', referencedColumnName: 'codigoProvincia' },
    { name: 'codigo_canton', referencedColumnName: 'codigoCanton' },
  ])
  canton!: Canton;

  @OneToMany(() => Barrio, (barrio) => barrio.distrito)
  barrios!: Barrio[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}