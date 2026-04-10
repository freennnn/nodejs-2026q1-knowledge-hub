import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Node.js' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'All about Node.js backend development' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
