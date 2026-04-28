import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CommentService } from '@/comment/comment.service';
import { authUsers, fixedDate, ids } from '../fixtures';
import { createPrismaMock, prismaMockProvider, type PrismaMock } from '../mocks/prisma.mock';

const prismaComment = {
  id: ids.comment,
  content: 'Great article',
  articleId: ids.article,
  authorId: ids.editor,
  createdAt: fixedDate,
};

const commentResponse = {
  id: ids.comment,
  content: 'Great article',
  articleId: ids.article,
  authorId: ids.editor,
  createdAt: fixedDate.getTime(),
};

describe('CommentService', () => {
  let service: CommentService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [CommentService, prismaMockProvider(prisma)],
    }).compile();

    service = moduleRef.get(CommentService);
  });

  it('returns comments for an article with numeric createdAt', async () => {
    prisma.comment.findMany.mockResolvedValue([prismaComment]);

    await expect(service.findAllByArticleId(ids.article)).resolves.toEqual([commentResponse]);
    expect(prisma.comment.findMany).toHaveBeenCalledWith({ where: { articleId: ids.article } });
  });

  it('throws NotFoundException when comment does not exist', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ids.comment)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an existing comment with numeric createdAt', async () => {
    prisma.comment.findUnique.mockResolvedValue(prismaComment);

    await expect(service.findOne(ids.comment)).resolves.toEqual(commentResponse);
  });

  it('creates a comment in a transaction after checking article existence', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article });
    prisma.comment.create.mockResolvedValue(prismaComment);

    await expect(
      service.create(
        {
          content: 'Great article',
          articleId: ids.article,
          authorId: ids.editor,
        },
        authUsers.editor,
      ),
    ).resolves.toEqual(commentResponse);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.article.findUnique).toHaveBeenCalledWith({
      where: { id: ids.article },
      select: { id: true },
    });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Great article',
        articleId: ids.article,
        authorId: ids.editor,
      },
    });
  });

  it('creates anonymous comments with null authorId when omitted', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: ids.article });
    prisma.comment.create.mockResolvedValue({ ...prismaComment, authorId: null });

    await expect(
      service.create(
        {
          content: 'Anonymous comment',
          articleId: ids.article,
        },
        authUsers.viewer,
      ),
    ).resolves.toEqual({
      ...commentResponse,
      authorId: null,
    });

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        content: 'Anonymous comment',
        articleId: ids.article,
        authorId: null,
      },
    });
  });

  it('throws UnprocessableEntityException when creating for a missing article', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          content: 'Great article',
          articleId: ids.article,
          authorId: ids.editor,
        },
        authUsers.editor,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('forbids editors from creating comments for another author', async () => {
    await expect(
      service.create(
        {
          content: 'Impersonated comment',
          articleId: ids.article,
          authorId: ids.user,
        },
        authUsers.editor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids editors from deleting comments they do not own', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: ids.comment, authorId: ids.user });

    await expect(service.remove(ids.comment, authUsers.editor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException before deleting missing comments', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.remove(ids.comment, authUsers.admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it('allows editors to delete their own comments', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: ids.comment, authorId: ids.editor });
    prisma.comment.delete.mockResolvedValue(prismaComment);

    await expect(service.remove(ids.comment, authUsers.editor)).resolves.toBeUndefined();
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: ids.comment } });
  });

  it('deletes existing comments for admins', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: ids.comment, authorId: ids.editor });
    prisma.comment.delete.mockResolvedValue(prismaComment);

    await expect(service.remove(ids.comment, authUsers.admin)).resolves.toBeUndefined();
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: ids.comment } });
  });
});
