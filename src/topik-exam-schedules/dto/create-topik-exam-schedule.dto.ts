import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTopikExamScheduleDto {
  @ApiProperty({ example: 'TOPIK Exam No. 107' })
  @IsString()
  @IsNotEmpty()
  exam_name: string;

  @ApiProperty({ example: '2026-07-05T00:00:00.000Z' })
  @IsDateString()
  exam_date: string;

  @ApiProperty({ example: '2026-05-12T00:00:00.000Z' })
  @IsDateString()
  registration_start_at: string;

  @ApiProperty({ example: '2026-05-18T23:59:59.000Z' })
  @IsDateString()
  registration_end_at: string;

  @ApiProperty({ example: '2026-08-13T00:00:00.000Z' })
  @IsDateString()
  result_date: string;

  @ApiProperty({ example: 'Korea / Overseas' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 55000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fee: number;

  @ApiProperty({ example: 'https://www.topik.go.kr/' })
  @IsString()
  @IsNotEmpty()
  registration_url: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  is_active?: number = 1;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  display_order?: number = 0;
}
