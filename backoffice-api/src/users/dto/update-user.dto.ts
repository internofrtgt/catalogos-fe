import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
