import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMockExamSessionDto {
  @ApiProperty({ example: 'question-set-id', description: 'Mock exam set ID' })
  @IsString()
  set_id: string;

  @ApiPropertyOptional({ example: 4200, default: 4200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  remaining_seconds?: number = 4200;
}
