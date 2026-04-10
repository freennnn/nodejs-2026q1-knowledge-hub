import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { Article } from '@/common/types/article';
import { InMemoryStore } from '@/persistence/in-memory/in-memory.store';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles.query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly store: InMemoryStore) {}

  findAll(query: ListArticlesQueryDto): Article[] {
    let articles = [...this.store.articles.values()];

    if (query.status) {
      articles = articles.filter((a) => a.status === query.status);
    }
    if (query.categoryId) {
      articles = articles.filter((a) => a.categoryId === query.categoryId);
    }
    if (query.tag) {
      articles = articles.filter((a) => a.tags.includes(query.tag!));
    }

    return articles;
  }

  findOne(id: string): Article {
    const article = this.store.articles.get(id);
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);
    return article;
  }

  create(dto: CreateArticleDto): Article {
    const now = Date.now();
    const article: Article = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status ?? ArticleStatus.DRAFT,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.store.articles.set(article.id, article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): Article {
    const article = this.store.articles.get(id);
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);

    const updated: Article = { ...article };

    if (dto.title !== undefined) updated.title = dto.title;
    if (dto.content !== undefined) updated.content = dto.content;
    if (dto.status !== undefined) updated.status = dto.status;
    if (dto.authorId !== undefined) updated.authorId = dto.authorId;
    if (dto.categoryId !== undefined) updated.categoryId = dto.categoryId;
    if (dto.tags !== undefined) updated.tags = dto.tags;

    updated.updatedAt = Date.now();

    this.store.articles.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    const article = this.store.articles.get(id);
    if (!article)
      throw new NotFoundException(`Article with id "${id}" not found`);

    // Cascade: delete comments for the article
    for (const [commentId, comment] of this.store.comments.entries()) {
      if (comment.articleId === id) {
        this.store.comments.delete(commentId);
      }
    }

    this.store.articles.delete(id);
  }
}
