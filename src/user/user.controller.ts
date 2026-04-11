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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @Get()
  findAll(
    @Query() query: ListQueryDto,
  ): UserResponseDto[] | PaginatedResponse<UserResponseDto> {
    const users = this.userService.findAll();
    const sorted = maybeSort(users, query.sortBy, query.order, [
      'id',
      'login',
      'role',
      'createdAt',
      'updatedAt',
    ]);
    return maybePaginate(sorted, query);
  }

  @ApiResponse({ status: 200, type: UserResponseDto })
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): UserResponseDto {
    return this.userService.findOne(id);
  }

  @ApiResponse({ status: 201, type: UserResponseDto })
  @Post()
  create(@Body() dto: CreateUserDto): UserResponseDto {
    return this.userService.create(dto);
  }

  @ApiResponse({ status: 200, type: UserResponseDto })
  @Put(':id')
  updatePassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePasswordDto,
  ): UserResponseDto {
    return this.userService.updatePassword(id, dto);
  }

  @ApiResponse({ status: 204 })
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    return this.userService.remove(id);
  }
}
