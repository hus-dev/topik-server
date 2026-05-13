import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { SyncOfflineItemDto } from './sync-offline-item.dto';

export class SyncOfflineDto {
  @ApiProperty({
    type: [SyncOfflineItemDto],
    description: 'Offline items to sync',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOfflineItemDto)
  items: SyncOfflineItemDto[];

  @ApiPropertyOptional({
    example: false,
    description: 'Replace local records before syncing',
  })
  @IsOptional()
  replace?: boolean = false;
}
