import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBarrioDto {
  @IsString()
  @MaxLength(120)
  provinciaNombre!: string;

  @IsInt()
  @Min(1)
  provinceCode!: number;

  @IsString()
  @MaxLength(120)
  cantonNombre!: string;

  @IsInt()
  @Min(1)
  cantonCode!: number;

  @IsString()
  @MaxLength(120)
  districtName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  districtCode?: number | null;

  @IsString()
  @MaxLength(120)
  nombre!: string;
}
