import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateBookmarkDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  bookmarked: boolean;
}
