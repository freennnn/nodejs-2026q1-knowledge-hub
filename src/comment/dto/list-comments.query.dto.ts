import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ListQueryDto } from '@/common/dto/list-query.dto';

export class ListCommentsQueryDto extends ListQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  articleId!: string;
}
