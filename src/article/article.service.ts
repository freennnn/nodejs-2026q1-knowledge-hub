import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { Article } from '@/common/types/article';
import {
  Article as PrismaArticle,
  ArticleStatus as PrismaArticleStatus,
} from '@prisma/client';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles.query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const prismaToAppArticleStatus = {
  [PrismaArticleStatus.DRAFT]: ArticleStatus.DRAFT,
  [PrismaArticleStatus.PUBLISHED]: ArticleStatus.PUBLISHED,
  [PrismaArticleStatus.ARCHIVED]: ArticleStatus.ARCHIVED,
} as const satisfies Record<PrismaArticleStatus, ArticleStatus>;

const appToPrismaArticleStatus = Object.fromEntries(
  Object.entries(prismaToAppArticleStatus).map(([k, v]) => [v, k]),
) as Record<ArticleStatus, PrismaArticleStatus>;

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListArticlesQueryDto): Promise<Article[]> {
    const articles = await this.prisma.article.findMany({
      where: {
        status: query.status ? appToPrismaArticleStatus[query.status] : undefined,
        categoryId: query.categoryId,
        tags: query.tag ? { some: { name: query.tag } } : undefined,
      },
      include: {
        tags: true,
      },
    });

    return articles.map((article) => this.toResponse(article));
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);
    return this.toResponse(article);
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const created = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: appToPrismaArticleStatus[dto.status ?? ArticleStatus.DRAFT],
        authorId: dto.authorId ?? null,
        categoryId: dto.categoryId ?? null,
        tags: {
          connectOrCreate: (dto.tags ?? []).map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      include: {
        tags: true,
      },
    });

    return this.toResponse(created);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status ? appToPrismaArticleStatus[dto.status] : undefined,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
        tags:
          dto.tags === undefined
            ? undefined
            : {
                set: [],
                connectOrCreate: dto.tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
      },
      include: {
        tags: true,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);

    // Related comments and tag links are deleted by FK cascade.
    await this.prisma.article.delete({
      where: { id },
    });
  }

  private toResponse(
    article: PrismaArticle & { tags: Array<{ name: string }> },
  ): Article {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      status: prismaToAppArticleStatus[article.status],
      authorId: article.authorId,
      categoryId: article.categoryId,
      tags: article.tags.map((tag) => tag.name),
      createdAt: article.createdAt.getTime(),
      updatedAt: article.updatedAt.getTime(),
    };
  }
}
