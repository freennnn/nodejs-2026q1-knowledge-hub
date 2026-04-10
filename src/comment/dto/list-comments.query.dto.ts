import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ListCommentsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  articleId!: string;
}
