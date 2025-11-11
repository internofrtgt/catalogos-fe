import { UserRole } from '../user.entity';

export class UserResponseDto {
  id!: string;
  username!: string;
  role!: UserRole;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class UserListResponseDto {
  data!: UserResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
  };
}
