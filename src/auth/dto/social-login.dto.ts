import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({
    example: 'google',
    description: 'Social provider name',
    enum: ['google', 'kakao'],
  })
  @IsString()
  @IsIn(['google', 'kakao'])
  provider: 'google' | 'kakao';

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
    description: 'Google ID token or Kakao access token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
