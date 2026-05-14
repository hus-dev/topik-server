import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EXPLANATION_VIDEO_SECTIONS } from './create-explanation-video.dto';

export class GetExplanationVideosQueryDto {
  @ApiPropertyOptional({ example: 'reading', enum: EXPLANATION_VIDEO_SECTIONS })
  @IsOptional()
  @IsString()
  @IsIn(EXPLANATION_VIDEO_SECTIONS)
  section?: (typeof EXPLANATION_VIDEO_SECTIONS)[number];

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  level?: number;

  @ApiPropertyOptional({ example: 'rm1-q1' })
  @IsOptional()
  @IsString()
  question_id?: string;

  @ApiPropertyOptional({ example: 'rm1' })
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
