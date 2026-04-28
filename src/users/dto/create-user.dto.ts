import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber, IsNotEmpty, IsDecimal } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'uuid-string', description: 'User ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'google', description: 'Auth provider' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: '123456789', description: 'Provider ID', required: false })
  @IsOptional()
  @IsString()
  provider_id?: string;

  @ApiProperty({ example: 'TopikMaster', description: 'User nickname' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 3, description: 'Target TOPIK level' })
  @IsNumber()
  target_level: number;

  @ApiProperty({ example: 'ko', description: 'Language code' })
  @IsString()
  @IsNotEmpty()
  language_code: string;

  @ApiProperty({ example: 'Asia/Seoul', description: 'Timezone' })
  @IsString()
  @IsNotEmpty()
  timezone: string;

  @ApiProperty({ example: 'countdown', description: 'Timer mode' })
  @IsString()
  @IsNotEmpty()
  timer_mode: string;
}
