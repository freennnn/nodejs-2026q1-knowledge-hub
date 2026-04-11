import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { USER_ROLE_VALUES, UserRole } from '@/common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  @IsNotEmpty()
  login!: string;

  @ApiProperty({ example: 'p@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ enum: USER_ROLE_VALUES, default: UserRole.VIEWER })
  @IsIn(USER_ROLE_VALUES)
  @IsOptional()
  role?: UserRole;
}
