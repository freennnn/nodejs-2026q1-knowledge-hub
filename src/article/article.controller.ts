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
  findAll(@Query() query: ListArticlesQueryDto): Article[] {
    return this.articleService.findAll(query);
  }

  @ApiResponse({ status: 200, type: Object })
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Article {
    return this.articleService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Post()
  create(@Body() dto: CreateArticleDto): Article {
    return this.articleService.create(dto);
  }

  @ApiResponse({ status: 200, type: Object })
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
  ): Article {
    return this.articleService.update(id, dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    return this.articleService.remove(id);
  }
}
