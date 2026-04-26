export class CreateUserDto {
  email: string;
  full_name?: string;
  target_level?: number;
  provider?: string;
  provider_id?: string;
}
