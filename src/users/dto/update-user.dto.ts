import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'TopikMaster',
    description: 'User nickname',
    required: false,
  })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({
    example: 3,
    description: 'Target TOPIK level',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  target_level?: number;

  @ApiProperty({ example: 'ko', description: 'Language code', required: false })
  @IsOptional()
  @IsString()
  language_code?: string;

  @ApiProperty({
    example: 'Asia/Seoul',
    description: 'Timezone',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    example: 'countdown',
    description: 'Timer mode',
    required: false,
  })
  @IsOptional()
  @IsString()
  timer_mode?: string;

  @ApiProperty({ example: '1.20', description: 'Font scale', required: false })
  @IsOptional()
  @IsString()
  font_scale?: string;

  @ApiProperty({ example: 'mint', description: 'Theme color', required: false })
  @IsOptional()
  @IsString()
  theme_color?: string;

  @ApiProperty({
    example: 1,
    description: 'Home layout index',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  home_layout?: number;

  @ApiProperty({
    example: 1,
    description: 'Practice layout index',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  practice_layout?: number;
}
