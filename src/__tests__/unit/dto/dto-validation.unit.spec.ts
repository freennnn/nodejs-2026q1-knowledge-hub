import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateArticleDto } from '@/article/dto/create-article.dto';
import { ListArticlesQueryDto } from '@/article/dto/list-articles.query.dto';
import { UpdateArticleDto } from '@/article/dto/update-article.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshDto } from '@/auth/dto/refresh.dto';
import { SignupDto } from '@/auth/dto/signup.dto';
import { CreateCategoryDto } from '@/category/dto/create-category.dto';
import { UpdateCategoryDto } from '@/category/dto/update-category.dto';
import { CreateCommentDto } from '@/comment/dto/create-comment.dto';
import { ListQueryDto } from '@/common/dto/list-query.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SortOrder, SortQueryDto } from '@/common/dto/sort-query.dto';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { UpdatePasswordDto } from '@/user/dto/update-password.dto';
import { UpdateUserDto } from '@/user/dto/update-user.dto';
import { ids } from '../fixtures';

async function validationErrors<T extends object>(
  Dto: new () => T,
  payload: Record<string, unknown>,
) {
  return validate(plainToInstance(Dto, payload));
}

async function expectValid<T extends object>(Dto: new () => T, payload: Record<string, unknown>) {
  await expect(validationErrors(Dto, payload)).resolves.toHaveLength(0);
}

async function expectInvalid<T extends object>(Dto: new () => T, payload: Record<string, unknown>) {
  const errors = await validationErrors(Dto, payload);
  expect(errors.length).toBeGreaterThan(0);
}

describe('DTO validation', () => {
  it('validates auth DTOs', async () => {
    await expectInvalid(SignupDto, {});
    await expectInvalid(LoginDto, { login: 'alice' });
    await expectInvalid(RefreshDto, { refreshToken: 123 });

    await expectValid(SignupDto, { login: 'alice', password: 'p@ssw0rd' });
    await expectValid(LoginDto, { login: 'alice', password: 'p@ssw0rd' });
    await expectValid(RefreshDto, {});
    await expectValid(RefreshDto, { refreshToken: 'token' });
  });

  it('validates user DTOs', async () => {
    await expectInvalid(CreateUserDto, { login: 'alice' });
    await expectInvalid(CreateUserDto, {
      login: 'alice',
      password: 'p@ssw0rd',
      role: 'owner',
    });
    await expectInvalid(UpdateUserDto, { role: 'owner' });
    await expectInvalid(UpdatePasswordDto, { oldPassword: 'old' });

    await expectValid(CreateUserDto, {
      login: 'alice',
      password: 'p@ssw0rd',
      role: UserRole.ADMIN,
    });
    await expectValid(UpdateUserDto, {
      oldPassword: 'old',
      newPassword: 'new',
      role: UserRole.VIEWER,
    });
    await expectValid(UpdatePasswordDto, { oldPassword: 'old', newPassword: 'new' });
  });

  it('validates article DTOs', async () => {
    await expectInvalid(CreateArticleDto, { title: 'Only title' });
    await expectInvalid(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      status: 'deleted',
    });
    await expectInvalid(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      authorId: 'not-a-uuid',
    });
    await expectInvalid(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      tags: [123],
    });
    await expectInvalid(UpdateArticleDto, { status: 'deleted' });
    await expectInvalid(UpdateArticleDto, { categoryId: 'not-a-uuid' });

    await expectValid(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      status: ArticleStatus.PUBLISHED,
      authorId: ids.editor,
      categoryId: null,
      tags: ['nestjs'],
    });
    await expectValid(UpdateArticleDto, {
      title: 'Updated',
      content: 'Updated content',
      status: ArticleStatus.ARCHIVED,
      authorId: null,
      categoryId: ids.category,
      tags: ['testing'],
    });
  });

  it('validates category and comment DTOs', async () => {
    await expectInvalid(CreateCategoryDto, { name: 'Node.js' });
    await expectInvalid(UpdateCategoryDto, { description: 'Missing name' });
    await expectInvalid(CreateCommentDto, { content: 'Missing article' });
    await expectInvalid(CreateCommentDto, {
      content: 'Bad article',
      articleId: 'not-a-uuid',
    });

    await expectValid(CreateCategoryDto, {
      name: 'Node.js',
      description: 'Backend runtime',
    });
    await expectValid(UpdateCategoryDto, {
      name: 'NestJS',
      description: 'Framework',
    });
    await expectValid(CreateCommentDto, {
      content: 'Nice article',
      articleId: ids.article,
      authorId: null,
    });
  });

  it('validates and transforms list query DTOs', async () => {
    const pagination = plainToInstance(PaginationQueryDto, { page: '2', limit: '10' });
    await expect(validate(pagination)).resolves.toHaveLength(0);
    expect(pagination).toMatchObject({ page: 2, limit: 10 });

    await expectInvalid(PaginationQueryDto, { page: '0', limit: 'abc' });

    const sort = plainToInstance(SortQueryDto, { sortBy: 'createdAt', order: 'DESC' });
    await expect(validate(sort)).resolves.toHaveLength(0);
    expect(sort.order).toBe(SortOrder.DESC);
    await expectInvalid(SortQueryDto, { order: 'sideways' });

    const list = plainToInstance(ListQueryDto, { page: '1', limit: '5', order: 'DESC' });
    await expect(validate(list)).resolves.toHaveLength(0);
    expect(list).toMatchObject({ page: 1, limit: 5, order: SortOrder.DESC });
  });

  it('validates article list query DTO', async () => {
    await expectInvalid(ListArticlesQueryDto, { status: 'deleted' });
    await expectInvalid(ListArticlesQueryDto, { categoryId: 'not-a-uuid' });

    await expectValid(ListArticlesQueryDto, {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      order: SortOrder.ASC,
      status: ArticleStatus.DRAFT,
      categoryId: ids.category,
      tag: 'nestjs',
    });
  });
});
