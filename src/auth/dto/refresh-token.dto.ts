import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'd9b2d63d-a233-4123-8c11-9a9926d8bc88',
    description: 'Refresh token to obtain new access token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
