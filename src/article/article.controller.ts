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
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthUser } from '@/auth/types/auth-user.type';
import { UserRole } from '@/common/enums/user-role.enum';
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
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
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
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<Article> {
    return this.articleService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Post()
  async create(@Body() dto: CreateArticleDto, @CurrentUser() actor: AuthUser): Promise<Article> {
    return this.articleService.create(dto, actor);
  }

  @ApiResponse({ status: 200, type: Object })
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<Article> {
    return this.articleService.update(id, dto, actor);
  }

  @ApiResponse({ status: 204 })
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<void> {
    return this.articleService.remove(id, actor);
  }
}
