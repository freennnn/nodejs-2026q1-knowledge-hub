import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  @IsNotEmpty()
  login!: string;

  @ApiProperty({ example: 'p@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
