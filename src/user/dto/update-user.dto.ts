import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { USER_ROLE_VALUES, UserRole } from '@/common/enums/user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'oldPass123' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  oldPassword?: string;

  @ApiPropertyOptional({ example: 'newPass456' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  newPassword?: string;

  @ApiPropertyOptional({ enum: USER_ROLE_VALUES })
  @IsIn(USER_ROLE_VALUES)
  @IsOptional()
  role?: UserRole;
}
