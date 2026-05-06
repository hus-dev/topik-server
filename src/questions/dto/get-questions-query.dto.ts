import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetQuestionsQueryDto {
  @ApiPropertyOptional({ example: 'reading', description: 'Question section' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ example: 3, description: 'TOPIK level' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({ example: 'multiple_choice', description: 'Question type' })
  @IsOptional()
  @IsString()
  question_type?: string;

  @ApiPropertyOptional({ example: 'set-id', description: 'Question set ID' })
  @IsOptional()
  @IsString()
  set_id?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
