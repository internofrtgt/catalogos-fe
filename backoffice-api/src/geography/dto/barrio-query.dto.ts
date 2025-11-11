import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CatalogQueryDto } from '../../catalogs/dto/catalog-query.dto';

export class BarrioQueryDto extends CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  provinceCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantonCode?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  districtName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provinceKey?: string;
}
