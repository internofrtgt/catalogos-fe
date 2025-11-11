import { PartialType } from '@nestjs/mapped-types';
import { CreateCantonDto } from './create-canton.dto';

export class UpdateCantonDto extends PartialType(CreateCantonDto) {}
