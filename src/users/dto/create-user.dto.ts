import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'local', description: 'Auth provider', required: false })
  @IsOptional()
  @IsString()
  provider?: string;

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
