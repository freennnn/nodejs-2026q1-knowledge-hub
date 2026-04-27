import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArticleService } from '@/article/article.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { UserRole } from '@/common/enums/user-role.enum';
import { articleDto, authUsers, ids, prismaArticle } from '../fixtures';
import { createPrismaMock, prismaMockProvider, type PrismaMock } from '../mocks/prisma.mock';

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [ArticleService, prismaMockProvider(prisma)],
    }).compile();

    service = moduleRef.get(ArticleService);
  });

  it('filters articles by status, categoryId, and tag', async () => {
    prisma.article.findMany.mockResolvedValue([prismaArticle]);

    await expect(
      service.findAll({
        status: ArticleStatus.PUBLISHED,
        categoryId: ids.category,
        tag: 'nestjs',
      }),
    ).resolves.toEqual([articleDto]);

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {
        status: PrismaArticleStatus.PUBLISHED,
        categoryId: ids.category,
        tags: { some: { name: 'nestjs' } },
      },
      include: { tags: true },
    });
  });

  it('omits optional filters when query is empty', async () => {
    prisma.article.findMany.mockResolvedValue([]);

    await expect(service.findAll({})).resolves.toEqual([]);

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {
        status: undefined,
        categoryId: undefined,
        tags: undefined,
      },
      include: { tags: true },
    });
  });

  it('throws NotFoundException when article does not exist', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ids.article)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing article', async () => {
    prisma.article.findUnique.mockResolvedValue(prismaArticle);

    await expect(service.findOne(ids.article)).resolves.toEqual(articleDto);
  });

  it('creates draft article with tag connectOrCreate by default', async () => {
    prisma.article.create.mockResolvedValue(prismaArticle);

    const result = await service.create(
      {
        title: 'Testing Nest Services',
        content: 'Unit tests isolate business logic.',
        authorId: ids.editor,
        categoryId: ids.category,
        tags: ['nestjs', 'vitest'],
      },
      authUsers.editor,
    );

    expect(prisma.article.create).toHaveBeenCalledWith({
      data: {
        title: 'Testing Nest Services',
        content: 'Unit tests isolate business logic.',
        status: PrismaArticleStatus.DRAFT,
        authorId: ids.editor,
        categoryId: ids.category,
        tags: {
          connectOrCreate: [
            { where: { name: 'nestjs' }, create: { name: 'nestjs' } },
            { where: { name: 'vitest' }, create: { name: 'vitest' } },
          ],
        },
      },
      include: { tags: true },
    });
    expect(result).toEqual(articleDto);
  });

  it('creates articles with nullable author/category and no tags when omitted', async () => {
    prisma.article.create.mockResolvedValue({
      ...prismaArticle,
      authorId: null,
      categoryId: null,
      status: PrismaArticleStatus.PUBLISHED,
      tags: [],
    });

    await service.create(
      {
        title: 'Published article',
        content: 'No relations',
        status: ArticleStatus.PUBLISHED,
      },
      authUsers.admin,
    );

    expect(prisma.article.create).toHaveBeenCalledWith({
      data: {
        title: 'Published article',
        content: 'No relations',
        status: PrismaArticleStatus.PUBLISHED,
        authorId: null,
        categoryId: null,
        tags: {
          connectOrCreate: [],
        },
      },
      include: { tags: true },
    });
  });

  it('forbids editors from creating articles for another author', async () => {
    await expect(
      service.create(
        {
          title: 'Other author',
          content: 'Forbidden',
          authorId: ids.user,
        },
        authUsers.editor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates status and replaces tags', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article, authorId: ids.editor });
    prisma.article.update.mockResolvedValue({
      ...prismaArticle,
      status: PrismaArticleStatus.PUBLISHED,
      tags: [{ name: 'published' }],
    });

    const result = await service.update(
      ids.article,
      {
        status: ArticleStatus.PUBLISHED,
        tags: ['published'],
      },
      authUsers.editor,
    );

    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: ids.article },
      data: {
        title: undefined,
        content: undefined,
        status: PrismaArticleStatus.PUBLISHED,
        authorId: undefined,
        categoryId: undefined,
        tags: {
          set: [],
          connectOrCreate: [{ where: { name: 'published' }, create: { name: 'published' } }],
        },
      },
      include: { tags: true },
    });
    expect(result.status).toBe(ArticleStatus.PUBLISHED);
    expect(result.tags).toEqual(['published']);
  });

  it('updates article fields without status or tag changes', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article, authorId: ids.editor });
    prisma.article.update.mockResolvedValue({
      ...prismaArticle,
      title: 'Renamed article',
    });

    await service.update(ids.article, { title: 'Renamed article' }, authUsers.editor);

    expect(prisma.article.update).toHaveBeenCalledWith({
      where: { id: ids.article },
      data: {
        title: 'Renamed article',
        content: undefined,
        status: undefined,
        authorId: undefined,
        categoryId: undefined,
        tags: undefined,
      },
      include: { tags: true },
    });
  });

  it('throws NotFoundException before updating missing articles', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(
      service.update(ids.article, { title: 'Missing' }, authUsers.admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.article.update).not.toHaveBeenCalled();
  });

  it('allows admin to archive an article', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article, authorId: ids.editor });
    prisma.article.update.mockResolvedValue({
      ...prismaArticle,
      status: PrismaArticleStatus.ARCHIVED,
    });

    const result = await service.update(
      ids.article,
      { status: ArticleStatus.ARCHIVED },
      { ...authUsers.admin, role: UserRole.ADMIN },
    );

    expect(result.status).toBe(ArticleStatus.ARCHIVED);
  });

  it('forbids editors from updating articles they do not own', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article, authorId: ids.user });

    await expect(
      service.update(ids.article, { title: 'Nope' }, authUsers.editor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids editors from assigning articles to another author', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article, authorId: ids.editor });

    await expect(
      service.update(ids.article, { authorId: ids.user }, authUsers.editor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids non-admin article deletion', async () => {
    await expect(service.remove(ids.article, authUsers.viewer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException before deleting missing articles', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(service.remove(ids.article, authUsers.admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.article.delete).not.toHaveBeenCalled();
  });

  it('deletes existing articles for admins', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article });
    prisma.article.delete.mockResolvedValue(prismaArticle);

    await expect(service.remove(ids.article, authUsers.admin)).resolves.toBeUndefined();
    expect(prisma.article.delete).toHaveBeenCalledWith({ where: { id: ids.article } });
  });
});
