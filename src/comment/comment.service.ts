import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Comment } from '@/common/types/comment';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment as PrismaComment} from '@prisma/client'

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByArticleId(articleId: string): Promise<Comment[]> {
    const comments = await this.prisma.comment.findMany({
      where: { articleId },
    });
    return comments.map((comment) => this.toResponse(comment));
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });
    if (!comment)
      throw new NotFoundException(`Comment with id "${id}" not found`);
    return this.toResponse(comment);
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    return this.prisma.$transaction(async (tx) => {
      const articleExists = await tx.article.findUnique({
        where: { id: dto.articleId },
        select: { id: true },
      });
      if (!articleExists) {
        throw new UnprocessableEntityException(
          `Article with id "${dto.articleId}" not found`,
        );
      }

      const created = await tx.comment.create({
        data: {
          content: dto.content,
          articleId: dto.articleId,
          authorId: dto.authorId ?? null,
        },
      });
      return this.toResponse(created);
    });
  }

  async remove(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!comment)
      throw new NotFoundException(`Comment with id "${id}" not found`);
    await this.prisma.comment.delete({
      where: { id },
    });
  }

  // manual Prisma's date to API Comment `createdAt`: number. Automatic JSON serialization would do that implicitly
  // via toISOString(), producing different format - "2026-04-10T12:34:56.789Z"
  // we use Pick<PrismaComment, union of fields' in order toResponse() work with potential partial selects
  // (queries with select/include combos). Function only requires/depends on this 5 specific fields only
  private toResponse(comment: Pick<PrismaComment, 'id' | 'content' | "articleId" | 'authorId' | 'createdAt'>): Comment {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt: comment.createdAt.getTime(),
    };
  }
}
