import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Article } from '@/common/types/article';
import { PaginatedResponse } from '@/common/types/paginated-response';
import { maybePaginate } from '@/common/utils/paginate';
import { maybeSort } from '@/common/utils/sort';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles.query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @ApiResponse({ status: 200, type: [Object] })
  @Get()
  async findAll(
    @Query() query: ListArticlesQueryDto,
  ): Promise<Article[] | PaginatedResponse<Article>> {
    const articles = await this.articleService.findAll(query);
    const sorted = maybeSort(articles, query.sortBy, query.order, [
      'id',
      'title',
      'status',
      'authorId',
      'categoryId',
      'createdAt',
      'updatedAt',
    ]);
    return maybePaginate(sorted, query);
  }

  @ApiResponse({ status: 200, type: Object })
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<Article> {
    return this.articleService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Post()
  async create(@Body() dto: CreateArticleDto): Promise<Article> {
    return this.articleService.create(dto);
  }

  @ApiResponse({ status: 200, type: Object })
  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<Article> {
    return this.articleService.update(id, dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    return this.articleService.remove(id);
  }
}
