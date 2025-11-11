import { IsString, MaxLength } from 'class-validator';

export class CreateApiDocumentDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(32)
  version!: string;

  @IsString()
  @MaxLength(255)
  summary!: string;

  @IsString()
  content!: string;
}
