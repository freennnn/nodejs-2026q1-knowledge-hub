import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Node.js' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Updated description' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
