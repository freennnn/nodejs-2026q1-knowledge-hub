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
import { PaginatedResponse } from '@/common/types/paginated-response';
import { maybePaginate } from '@/common/utils/paginate';
import { ListQueryDto } from '@/common/dto/list-query.dto';
import { maybeSort } from '@/common/utils/sort';
import { Category } from '@/common/types/category';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryService } from './category.service';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiResponse({ status: 200, type: [Object] })
  @Get()
  findAll(
    @Query() query: ListQueryDto,
  ): Category[] | PaginatedResponse<Category> {
    const categories = this.categoryService.findAll();
    const sorted = maybeSort(categories, query.sortBy, query.order, [
      'id',
      'name',
      'description',
    ]);
    return maybePaginate(sorted, query);
  }

  @ApiResponse({ status: 200, type: Object })
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Category {
    return this.categoryService.findOne(id);
  }

  @ApiResponse({ status: 201, type: Object })
  @Post()
  create(@Body() dto: CreateCategoryDto): Category {
    return this.categoryService.create(dto);
  }

  @ApiResponse({ status: 200, type: Object })
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Category {
    return this.categoryService.update(id, dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    return this.categoryService.remove(id);
  }
}
