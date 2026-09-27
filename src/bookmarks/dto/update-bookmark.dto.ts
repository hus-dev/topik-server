import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBookmarkDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  bookmarked: boolean;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsOptional()
  @IsString()
  meaning_user_lang?: string;
}
