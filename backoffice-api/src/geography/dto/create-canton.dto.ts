import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCantonDto {
  @IsString()
  @MaxLength(120)
  provinciaNombre!: string;

  @IsInt()
  @Min(1)
  provinceCode!: number;

  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsInt()
  @IsPositive()
  codigo!: number;
}
