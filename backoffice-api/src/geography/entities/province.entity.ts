import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Canton } from './canton.entity';

@Entity({ name: 'provincias' })
@Index('provincias_codigo_uq', ['codigo'], { unique: true })
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: 'int' })
  codigo!: number;

  @OneToMany(() => Canton, (canton) => canton.province, {
    cascade: ['remove'],
  })
  cantones!: Canton[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
