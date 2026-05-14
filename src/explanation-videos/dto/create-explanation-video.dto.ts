import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const EXPLANATION_VIDEO_SECTIONS = [
  'reading',
  'listening',
  'writing',
] as const;

export class CreateExplanationVideoDto {
  @ApiProperty({ example: 'How to solve TOPIK reading question 1' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A step-by-step explanation of the question.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/thumbnails/video-1.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({ example: 'https://cdn.example.com/videos/video-1.mp4' })
  @IsString()
  @IsNotEmpty()
  video_url: string;

  @ApiPropertyOptional({ example: 'rm1-q1' })
  @IsOptional()
  @IsString()
  question_id?: string;

  @ApiPropertyOptional({ example: 'rm1' })
  @IsOptional()
  @IsString()
  set_id?: string;

  @ApiPropertyOptional({
    example: 'reading',
    enum: EXPLANATION_VIDEO_SECTIONS,
    type: String,
  })
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

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  is_recommended?: number = 0;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  display_order?: number = 0;
}
