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
import { UserRole } from '@/common/enums/user-role.enum';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthUser } from '@/auth/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiResponse({ status: 200, type: [UserResponseDto] })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @Get()
  async findAll(
    @Query() query: ListQueryDto,
  ): Promise<UserResponseDto[] | PaginatedResponse<UserResponseDto>> {
    const users = await this.userService.findAll();
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
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @ApiResponse({ status: 201, type: UserResponseDto })
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }

  @ApiResponse({ status: 200, type: UserResponseDto })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto, actor);
  }

  @ApiResponse({ status: 204 })
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
