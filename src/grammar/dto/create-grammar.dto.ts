import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGrammarDto {
  @ApiProperty({ example: '-고 있다' })
  @IsString()
  @IsNotEmpty()
  pattern: string;

  @ApiProperty({ example: 'Used for progressive aspect' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: [{ ko: '공부하고 있다', en: 'is studying' }] })
  examples_json: any;

  @ApiProperty({ example: ['TOPIK II', 'progressive'] })
  tags_json: any;
}
