import { ApiProperty } from '@nestjs/swagger';

export class GenericPromptResponseDto {
  @ApiProperty()
  text!: string;

  @ApiProperty()
  cacheHit!: boolean;
}
