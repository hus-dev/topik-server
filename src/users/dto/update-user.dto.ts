import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto implements Partial<CreateUserDto> {
  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  full_name?: string;

  @ApiProperty({ required: false })
  target_level?: number;

  @ApiProperty({ required: false })
  provider?: string;

  @ApiProperty({ required: false })
  provider_id?: string;

  @ApiProperty({ required: false, default: 0 })
  current_streak?: number;

  @ApiProperty({ required: false, default: 0 })
  total_points?: number;

  @ApiProperty({ required: false, default: 5 })
  hearts?: number;
}
