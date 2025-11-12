import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CatalogQueryDto } from '../../catalogs/dto/catalog-query.dto';

export class BarrioQueryDto extends CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigoProvincia?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoCanton?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  distrito?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provinceKey?: string;
}
