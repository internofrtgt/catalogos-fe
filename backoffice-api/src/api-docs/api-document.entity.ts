import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'api_documents' })
@Index('api_documents_title_version_uq', ['title', 'version'], { unique: true })
export class ApiDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160 })
  title!: string;

  @Column({ length: 32 })
  version!: string;

  @Column({ length: 255 })
  summary!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
