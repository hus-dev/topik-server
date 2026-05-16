import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'TopikMaster',
    description: '사용자명 (Username/Nickname)',
  })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일 (Email)' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (Password)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
