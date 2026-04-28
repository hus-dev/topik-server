import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateQuestionSetDto {
  @ApiProperty({ example: 'TOPIK II 60th Listening', description: 'Set Title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'listening', description: 'Section (listening, reading, writing)' })
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ example: 2, description: 'Level (1 or 2)' })
  @IsNumber()
  level: number;
}
