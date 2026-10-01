import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class GenerateAiExampleDto {
  @ApiProperty({
    description: '한국어 단어',
    example: '노력하다',
  })
  @IsString()
  @IsNotEmpty()
  word: string;

  @ApiPropertyOptional({
    description: '단어의 의미 또는 뜻 (동음이의어 구분 및 문맥 파악용)',
    example: '목적을 이루기 위하여 힘을 쓰다',
  })
  @IsString()
  @IsOptional()
  meaning?: string;

  @ApiProperty({
    description: '학습자 번역 언어 코드 (ko, uz, en, ru, vi, ja, zh 등)',
    example: 'uz',
  })
  @IsString()
  @IsNotEmpty()
  targetLang: string;

  @ApiPropertyOptional({
    description: '예문 변형 인덱스 (0, 1, 2, ...)',
    example: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  index?: number = 0;
}
