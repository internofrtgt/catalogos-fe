import {
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCantonDto {
  @IsString()
  @MaxLength(120)
  provincia!: string;

  @IsInt()
  @Min(1)
  codigoProvincia!: number;

  @IsString()
  @MaxLength(120)
  canton!: string;

  @IsString()
  @MaxLength(50)
  codigoCanton!: string;
}