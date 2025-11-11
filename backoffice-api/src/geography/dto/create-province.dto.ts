import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateProvinceDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsInt()
  @IsPositive()
  codigo!: number;
}
