import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import {
  UserListResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const normalised = username.toLowerCase();
    return this.usersRepository.findOne({
      where: { username: normalised },
    });
  }

  private async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`No existe el usuario con id "${id}"`);
    }
    return user;
  }

  async findAll(query: UserQueryDto): Promise<UserListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const qb = this.usersRepository.createQueryBuilder('user');

    if (query.search) {
      const term = query.search.trim().toLowerCase();
      qb.where('LOWER(user.username) LIKE :search', { search: `%${term}%` });
    }

    qb
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((user) => this.toResponse(user)),
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findByIdOrThrow(id);
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const username = dto.username.toLowerCase();
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new ConflictException('El usuario ya existe');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const entity = this.usersRepository.create({
      username,
      passwordHash,
      role: dto.role ?? UserRole.OPERATOR,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.usersRepository.save(entity);
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findByIdOrThrow(id);

    if (dto.username) {
      const normalised = dto.username.toLowerCase();
      if (normalised !== user.username) {
        const duplicated = await this.findByUsername(normalised);
        if (duplicated && duplicated.id !== id) {
          throw new ConflictException(
            `El usuario "${dto.username}" ya existe`,
          );
        }
        user.username = normalised;
      }
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
  }

  async remove(id: string, actingUserId?: string): Promise<void> {
    if (actingUserId && actingUserId === id) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }
    const user = await this.findByIdOrThrow(id);
    await this.usersRepository.remove(user);
  }

  async ensureAdminUser(
    username: string,
    password: string,
  ): Promise<{ created: boolean }> {
    const normalisedUsername = username.toLowerCase();
    let user = await this.findByUsername(normalisedUsername);
    const passwordHash = await bcrypt.hash(password, 12);

    if (!user) {
      user = this.usersRepository.create({
        username: normalisedUsername,
        passwordHash,
        role: UserRole.ADMIN,
      });
      await this.usersRepository.save(user);
      return { created: true };
    }

    let hasChanges = false;

    if (user.role !== UserRole.ADMIN) {
      user.role = UserRole.ADMIN;
      hasChanges = true;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      user.passwordHash = passwordHash;
      hasChanges = true;
    }

    if (hasChanges) {
      await this.usersRepository.save(user);
    }

    return { created: false };
  }
}
