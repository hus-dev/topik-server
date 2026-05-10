import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVocabularyDto {
  @ApiProperty({ example: '학교' })
  @IsString()
  word: string;

  @ApiProperty({ example: 'school' })
  @IsString()
  meaning_ko: string;

  @ApiPropertyOptional({ example: 'school' })
  @IsOptional()
  @IsString()
  meaning_user_lang?: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @ApiPropertyOptional({ example: 'https://example.com/tts.mp3' })
  @IsOptional()
  @IsString()
  tts_url?: string;
}
