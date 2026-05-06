import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePracticeSessionDto {
  @ApiProperty({ example: 'reading', description: 'Practice section' })
  @IsString()
  section: string;

  @ApiPropertyOptional({ example: 'practice', default: 'practice' })
  @IsOptional()
  @IsString()
  mode?: string = 'practice';

  @ApiPropertyOptional({ example: 'question-set-id' })
  @IsOptional()
  @IsString()
  set_id?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  remaining_seconds?: number = 0;
}
