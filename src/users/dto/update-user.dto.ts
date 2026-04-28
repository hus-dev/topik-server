import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsNumber, IsDecimal } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: '1.20', description: 'Font scale', required: false })
  @IsOptional()
  @IsString()
  font_scale?: string;

  @ApiProperty({ example: 'mint', description: 'Theme color', required: false })
  @IsOptional()
  @IsString()
  theme_color?: string;

  @ApiProperty({ example: 1, description: 'Home layout index', required: false })
  @IsOptional()
  @IsNumber()
  home_layout?: number;

  @ApiProperty({ example: 1, description: 'Practice layout index', required: false })
  @IsOptional()
  @IsNumber()
  practice_layout?: number;
}
