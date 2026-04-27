import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ example: 3, description: 'Target TOPIK level', required: false })
  @IsOptional()
  @IsNumber()
  target_level?: number;

  @ApiProperty({
    example: 'google',
    description: 'OAuth provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    example: '123456789',
    description: 'OAuth provider ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider_id?: string;
}
