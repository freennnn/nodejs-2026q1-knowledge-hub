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

const COMMENT_SORTABLE_FIELDS = [
  'id',
  'content',
  'authorId',
  'articleId',
  'createdAt',
] as const satisfies readonly (keyof Comment)[];

@ApiTags('comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiResponse({ status: 200, type: [Object] })
  @Get()
  async findAll(
    @Query() query: ListCommentsQueryDto,
  ): Promise<Comment[] | PaginatedResponse<Comment>> {
    const comments = await this.commentService.findAllByArticleId(query.articleId);
    const sorted = maybeSort(comments, query.sortBy, query.order, COMMENT_SORTABLE_FIELDS);
    return maybePaginate(sorted, query);
  }

  @ApiResponse({ status: 200, type: Object })
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Comment> {
    return this.commentService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Post()
  async create(@Body() dto: CreateCommentDto): Promise<Comment> {
    return this.commentService.create(dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.commentService.remove(id);
  }
}
