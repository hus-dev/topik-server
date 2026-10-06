import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetAiWritingFeedbackDto {
  @ApiProperty({
    description: 'The writing text submitted by the student (or ㉠ / ㉡ answers)',
    example: '㉠ 참석할 수 없습니다 / ㉡ 연락해 주시기 바랍니다',
  })
  @IsString()
  @IsNotEmpty()
  userAnswer: string;

  @ApiPropertyOptional({
    description: 'Target language code (e.g. uz, ru, en, ko, vi). Defaults to uz.',
    example: 'uz',
  })
  @IsString()
  @IsOptional()
  languageCode?: string;
}
