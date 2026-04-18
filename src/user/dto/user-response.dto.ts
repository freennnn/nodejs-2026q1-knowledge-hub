import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLE_VALUES, UserRole } from '@/common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  login!: string;

  @ApiProperty({ enum: USER_ROLE_VALUES })
  role!: UserRole;

  @ApiProperty()
  createdAt!: number;

  @ApiProperty()
  updatedAt!: number;
}
