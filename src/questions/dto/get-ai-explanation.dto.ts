import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetAiExplanationDto {
  @ApiProperty({
    description: 'The option selected by the student (e.g. "1", "2", "3", "4", or option text)',
    example: '2',
  })
  @IsString()
  @IsNotEmpty()
  selectedOption: string;

  @ApiPropertyOptional({
    description: 'Target language code (e.g. uz, ru, en, ko, vi). Defaults to user language or uz.',
    example: 'uz',
  })
  @IsString()
  @IsOptional()
  languageCode?: string;
}
