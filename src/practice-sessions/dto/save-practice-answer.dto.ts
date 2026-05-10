import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SavePracticeAnswerDto {
  @ApiProperty({ example: 'question-id' })
  @IsString()
  question_id: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  selected_answer?: string;

  @ApiPropertyOptional({ example: 'Written answer text' })
  @IsOptional()
  @IsString()
  text_answer?: string;

  @ApiPropertyOptional({ example: 45, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  spent_seconds?: number = 0;

  @ApiPropertyOptional({ example: 1, default: 0, description: '0 or 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  bookmarked?: number = 0;
}
