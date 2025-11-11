import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDistrictDto {
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
  nombre!: string;

  @IsInt()
  @IsPositive()
  codigo!: number;
}
