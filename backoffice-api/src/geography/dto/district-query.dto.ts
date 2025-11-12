import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CatalogQueryDto } from '../../catalogs/dto/catalog-query.dto';

export class DistrictQueryDto extends CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigoProvincia?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoCanton?: string;
}
