import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@/common/enums/user-role.enum';
import { Article } from '@/common/types/article';
import { User } from '@/common/types/user';
import { InMemoryStore } from '@/persistence/in-memory/in-memory.store';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly store: InMemoryStore) {}

  findAll(): UserResponseDto[] {
    return [...this.store.users.values()].map((u) => this.toResponse(u));
  }

  findOne(id: string): UserResponseDto {
    const user = this.store.users.get(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return this.toResponse(user);
  }

  create(dto: CreateUserDto): UserResponseDto {
    const now = Date.now();
    const user: User = {
      id: randomUUID(),
      login: dto.login,
      password: dto.password,
      role: dto.role ?? UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };

    this.store.users.set(user.id, user);
    return this.toResponse(user);
  }

  updatePassword(id: string, dto: UpdatePasswordDto): UserResponseDto {
    const user = this.store.users.get(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }

    const updated: User = {
      ...user,
      password: dto.newPassword,
      updatedAt: Date.now(),
    };
    this.store.users.set(id, updated);
    return this.toResponse(updated);
  }

  remove(id: string): void {
    const user = this.store.users.get(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);

    // Cascade: null authorId in Articles
    for (const [articleId, article] of this.store.articles.entries()) {
      if (article.authorId === id) {
        const updated: Article = {
          ...article,
          authorId: null,
          updatedAt: Date.now(),
        };
        this.store.articles.set(articleId, updated);
      }
    }

    // Cascade: delete Comments by authorId
    for (const [commentId, comment] of this.store.comments.entries()) {
      if (comment.authorId === id) {
        this.store.comments.delete(commentId);
      }
    }

    this.store.users.delete(id);
  }

  private toResponse(user: User): UserResponseDto {
    // Password must be excluded from responses.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }
}
