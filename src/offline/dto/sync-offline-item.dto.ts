import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  OFFLINE_ENTITY_TYPES,
  OFFLINE_STATUSES,
} from './get-offline-items.query';

export class SyncOfflineItemDto {
  @ApiProperty({
    example: 'question',
    description: 'Entity type to sync',
    enum: OFFLINE_ENTITY_TYPES,
    type: String,
  })
  @IsString()
  @IsIn(OFFLINE_ENTITY_TYPES)
  entity_type: (typeof OFFLINE_ENTITY_TYPES)[number];

  @ApiProperty({
    example: 'question-id',
    description: 'Entity ID to sync',
  })
  @IsString()
  entity_id: string;

  @ApiProperty({
    example: 'downloaded',
    description: 'Sync status',
    required: false,
    enum: OFFLINE_STATUSES,
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsIn(OFFLINE_STATUSES)
  status?: (typeof OFFLINE_STATUSES)[number];
}
