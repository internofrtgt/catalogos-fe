import { PartialType } from '@nestjs/mapped-types';
import { CreateBarrioDto } from './create-barrio.dto';

export class UpdateBarrioDto extends PartialType(CreateBarrioDto) {}
