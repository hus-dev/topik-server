import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const OFFLINE_ENTITY_TYPES = [
  'question',
  'vocabulary',
  'grammar',
] as const;
export const OFFLINE_STATUSES = ['downloaded', 'pending', 'failed'] as const;

export class GetOfflineItemsQueryDto {
  @ApiPropertyOptional({
    example: 'question',
    description: 'Filter by entity type',
    enum: OFFLINE_ENTITY_TYPES,
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsIn(OFFLINE_ENTITY_TYPES)
  entity_type?: (typeof OFFLINE_ENTITY_TYPES)[number];

  @ApiPropertyOptional({
    example: 'downloaded',
    description: 'Filter by sync status',
    enum: OFFLINE_STATUSES,
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsIn(OFFLINE_STATUSES)
  status?: (typeof OFFLINE_STATUSES)[number];

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
  limit?: number = 20;
}
