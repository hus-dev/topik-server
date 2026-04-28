import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, provider, provider_id, password } = createUserDto;

    // Check if user exists by email if provided
    if (email) {
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Check if user exists by provider
    if (provider && provider_id) {
      const existingProvider = await this.usersService.findByProviderAndId(
        provider,
        provider_id,
      );
      if (existingProvider) {
        throw new ConflictException('User with this provider and provider_id already exists');
      }
    }

    // Hash password if provided
    let password_hash: string | undefined;
    if (password) {
      const salt = await bcrypt.genSalt();
      password_hash = await bcrypt.hash(password, salt);
    }

    // Create user
    const user = await this.usersService.create({
      ...createUserDto,
      password_hash,
    });

    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findForAuth(loginDto.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  async validateUser(payload: any) {
    return await this.usersService.findOne(payload.sub);
  }
}
