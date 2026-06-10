import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsInt,
  IsIn,
  Min,
} from 'class-validator';
import { EXAM_KINDS, EXAM_KIND } from '../../common/exam-kind';

export class CreateQuestionSetDto {
  @ApiProperty({
    example: 'TOPIK II 60th Listening',
    description: 'Set Title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'listening',
    description: 'Section (listening, reading, writing)',
  })
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ example: 2, description: 'Level (1 or 2)' })
  @IsNumber()
  level: number;

  @ApiPropertyOptional({
    example: 'practice',
    description: 'Exam kind (practice, mock, or type)',
  })
  @IsOptional()
  @IsString()
  @IsIn(EXAM_KINDS)
  exam_kind?: string = EXAM_KIND.PRACTICE;

  @ApiPropertyOptional({ example: 50, description: 'Total questions' })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_questions?: number;

  @ApiPropertyOptional({ example: 4200, description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;

  @ApiPropertyOptional({ example: 50, description: 'Price' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 0, description: '0 or 1' })
  @IsOptional()
  @IsInt()
  @Min(0)
  is_free?: number;

  @ApiPropertyOptional({ example: 1, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}
