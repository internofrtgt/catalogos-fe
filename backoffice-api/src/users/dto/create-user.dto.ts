import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.OPERATOR;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
