import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Comment } from '@/common/types/comment';
import { PaginatedResponse } from '@/common/types/paginated-response';
import { maybePaginate } from '@/common/utils/paginate';
import { maybeSort } from '@/common/utils/sort';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsQueryDto } from './dto/list-comments.query.dto';

@ApiTags('comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiResponse({ status: 200, type: [Object] })
  @Get()
  findAll(
    @Query() query: ListCommentsQueryDto,
  ): Comment[] | PaginatedResponse<Comment> {
    const comments = this.commentService.findAllByArticleId(query.articleId);
    const sorted = maybeSort(comments, query.sortBy, query.order, [
      'id',
      'content',
      'authorId',
      'articleId',
      'createdAt',
    ]);
    return maybePaginate(sorted, query);
  }

  @ApiResponse({ status: 200, type: Object })
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Comment {
    return this.commentService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Post()
  create(@Body() dto: CreateCommentDto): Comment {
    return this.commentService.create(dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    return this.commentService.remove(id);
  }
}
