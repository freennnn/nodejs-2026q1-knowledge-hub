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
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PaginatedResponse } from '@/common/types/paginated';
import { maybePaginate } from '@/common/utils/paginate';
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
    @Query() query: PaginationQueryDto,
  ): UserResponseDto[] | PaginatedResponse<UserResponseDto> {
    const users = this.userService.findAll();
    return maybePaginate(users, query);
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
