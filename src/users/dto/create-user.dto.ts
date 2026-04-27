import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: false,
  })
  full_name?: string;

  @ApiProperty({ example: 3, description: 'Target TOPIK level', required: false })
  target_level?: number;

  @ApiProperty({
    example: 'google',
    description: 'OAuth provider',
    required: false,
  })
  provider?: string;

  @ApiProperty({
    example: '123456789',
    description: 'OAuth provider ID',
    required: false,
  })
  provider_id?: string;
}
