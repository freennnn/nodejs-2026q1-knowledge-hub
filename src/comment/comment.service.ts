import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Comment } from '@/common/types/comment';
import { InMemoryStore } from '@/persistence/in-memory/in-memory.store';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly store: InMemoryStore) {}

  findAllByArticleId(articleId: string): Comment[] {
    return [...this.store.comments.values()].filter(
      (c) => c.articleId === articleId,
    );
  }

  findOne(id: string): Comment {
    const comment = this.store.comments.get(id);
    if (!comment)
      throw new NotFoundException(`Comment with id "${id}" not found`);
    return comment;
  }

  create(dto: CreateCommentDto): Comment {
    const articleExists = this.store.articles.has(dto.articleId);
    if (!articleExists) {
      throw new UnprocessableEntityException(
        `Article with id "${dto.articleId}" not found`,
      );
    }

    const comment: Comment = {
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: Date.now(),
    };

    this.store.comments.set(comment.id, comment);
    return comment;
  }

  remove(id: string): void {
    const comment = this.store.comments.get(id);
    if (!comment)
      throw new NotFoundException(`Comment with id "${id}" not found`);
    this.store.comments.delete(id);
  }
}
