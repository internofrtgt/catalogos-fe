import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CatalogQueryDto } from '../../catalogs/dto/catalog-query.dto';

export class CantonQueryDto extends CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigoProvincia?: number;
}
