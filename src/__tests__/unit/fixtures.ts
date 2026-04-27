import {
  ArticleStatus as PrismaArticleStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { AuthUser } from '@/auth/types/auth-user.type';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';

export const fixedDate = new Date('2026-01-01T00:00:00.000Z');

export const ids = {
  user: '11111111-1111-4111-8111-111111111111',
  editor: '22222222-2222-4222-8222-222222222222',
  viewer: '33333333-3333-4333-8333-333333333333',
  article: '44444444-4444-4444-8444-444444444444',
  category: '55555555-5555-4555-8555-555555555555',
  comment: '66666666-6666-4666-8666-666666666666',
};

export const authUsers = {
  admin: {
    userId: ids.user,
    login: 'admin',
    role: UserRole.ADMIN,
  } satisfies AuthUser,
  editor: {
    userId: ids.editor,
    login: 'editor',
    role: UserRole.EDITOR,
  } satisfies AuthUser,
  viewer: {
    userId: ids.viewer,
    login: 'viewer',
    role: UserRole.VIEWER,
  } satisfies AuthUser,
};

export const prismaUsers = {
  admin: {
    id: ids.user,
    login: 'admin',
    password: 'hashed-password',
    role: PrismaUserRole.ADMIN,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  },
  editor: {
    id: ids.editor,
    login: 'editor',
    password: 'hashed-password',
    role: PrismaUserRole.EDITOR,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  },
  viewer: {
    id: ids.viewer,
    login: 'viewer',
    password: 'hashed-password',
    role: PrismaUserRole.VIEWER,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  },
};

export const prismaArticle = {
  id: ids.article,
  title: 'Testing Nest Services',
  content: 'Unit tests isolate business logic.',
  status: PrismaArticleStatus.DRAFT,
  createdAt: fixedDate,
  updatedAt: fixedDate,
  authorId: ids.editor,
  categoryId: ids.category,
  tags: [{ name: 'nestjs' }, { name: 'vitest' }],
};

export const articleDto = {
  id: ids.article,
  title: prismaArticle.title,
  content: prismaArticle.content,
  status: ArticleStatus.DRAFT,
  createdAt: fixedDate.getTime(),
  updatedAt: fixedDate.getTime(),
  authorId: ids.editor,
  categoryId: ids.category,
  tags: ['nestjs', 'vitest'],
};
