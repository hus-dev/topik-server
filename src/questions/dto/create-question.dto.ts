import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuestionOptionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  option_number: number;

  @ApiProperty({ example: '정답 보기' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 1, description: '0 or 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  is_correct?: number = 0;
}

export class CreateQuestionMediaDto {
  @ApiProperty({ example: 'audio' })
  @IsString()
  media_type: string;

  @ApiProperty({ example: 'https://example.com/audio.mp3' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration_seconds?: number;

  @ApiPropertyOptional({ example: 'Audio transcript text' })
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sort_order?: number = 1;
}

export class CreateQuestionDto {
  @ApiPropertyOptional({ example: 'question-set-id' })
  @IsOptional()
  @IsString()
  set_id?: string;

  @ApiPropertyOptional({ example: 'passage-id' })
  @IsOptional()
  @IsString()
  passage_id?: string;

  @ApiProperty({ example: 'reading' })
  @IsString()
  section: string;

  @ApiProperty({ example: 'multiple_choice' })
  @IsString()
  question_type: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  question_number: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  level?: number;

  @ApiProperty({ example: '다음 글을 읽고 맞는 답을 고르십시오.' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiPropertyOptional({ example: '정답 해설입니다.' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ example: 'AI-generated explanation' })
  @IsOptional()
  @IsString()
  ai_explanation?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  time_limit_seconds?: number;

  @ApiPropertyOptional({ example: 0, description: '0 or 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  is_ai_generated?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 or 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  is_downloaded?: number = 0;

  @ApiPropertyOptional({ type: [CreateQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  question_options?: CreateQuestionOptionDto[];

  @ApiPropertyOptional({ type: [CreateQuestionMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionMediaDto)
  question_media?: CreateQuestionMediaDto[];
}
