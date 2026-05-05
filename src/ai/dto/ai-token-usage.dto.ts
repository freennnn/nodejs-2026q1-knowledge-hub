import { ApiProperty } from '@nestjs/swagger';

export class AiTokenUsageDto {
  @ApiProperty()
  prompt!: number;

  @ApiProperty()
  candidates!: number;

  @ApiProperty({
    description: 'Normalized total computed as prompt + candidates',
  })
  total!: number;
}
