import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto implements Partial<CreateUserDto> {
  email?: string;
  full_name?: string;
  target_level?: number;
  provider?: string;
  provider_id?: string;
  current_streak?: number;
  total_points?: number;
  hearts?: number;
}
