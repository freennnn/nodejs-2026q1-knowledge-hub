import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@/common/enums/user-role.enum';
import {
  Prisma,
  User as PrismaUser,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserResponseDto } from './dto/user-response.dto';

const prismaToAppUserRole = {
  [PrismaUserRole.ADMIN]: UserRole.ADMIN,
  [PrismaUserRole.EDITOR]: UserRole.EDITOR,
  [PrismaUserRole.VIEWER]: UserRole.VIEWER,
} as const satisfies Record<PrismaUserRole, UserRole>;

const appToPrismaUserRole = Object.fromEntries(
  Object.entries(prismaToAppUserRole).map(([k, v]) => [v, k]),
) as Record<UserRole, PrismaUserRole>;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    let created: PrismaUser;
    try {
      created = await this.prisma.user.create({
        data: {
          login: dto.login,
          password: dto.password,
          role: appToPrismaUserRole[dto.role ?? UserRole.VIEWER],
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Login is already taken');
      }
      throw error;
    }

    return this.toResponse(created);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { password: dto.newPassword },
    });
    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) throw new NotFoundException(`User with id "${id}" not found`);

    // this.store.users.delete(id);
    // Cascade: null authorId in Articles
    // for (const [articleId, article] of this.store.articles.entries()) {
    //   if (article.authorId === id) {
    //     const updated: Article = {
    //       ...article,
    //       authorId: null,
    //       updatedAt: Date.now(),
    //     };
    //     this.store.articles.set(articleId, updated);
    //   }
    // }

    // Cascade: delete Comments by authorId
    // for (const [commentId, comment] of this.store.comments.entries()) {
    //   if (comment.authorId === id) {
    //     this.store.comments.delete(commentId);
    //   }
    // }

    // Rely on DB-level onDelete rules from Prisma schema.
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toResponse(user: PrismaUser): UserResponseDto {
    // Password must be excluded from responses.
    // PrismaUserRole enum mapped to app model UserRole enum (aka union of consts)
    // Prisma dates converted to numbers in DTO

    return {
      id: user.id,
      login: user.login,
      role: prismaToAppUserRole[user.role],
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
  }
}
