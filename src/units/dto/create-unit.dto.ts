import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 1, description: 'TOPIK Level' })
  @IsNumber()
  level: number;

  @ApiProperty({ example: 'Basic Vocabulary', description: 'Unit Title' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Learn basic Korean words',
    description: 'Unit Description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: 'Order Index' })
  @IsNumber()
  order_index: number;
}
