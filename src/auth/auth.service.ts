import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, provider, provider_id } = createUserDto;
    const password = (createUserDto as any).password;

    // Check if user exists by email if provided
    if (email) {
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Check if user exists by provider
    if (provider && provider_id) {
      const existingProvider = await this.usersService.findByProvider(
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

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    // password_hash가 없는 사용자는 소셜 가입자일 수 있음
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

    return this.buildAuthResponse(user);
  }

  async socialSignIn(socialLoginDto: SocialLoginDto) {
    // 1. 토큰 검증 및 소셜 ID 추출
    const providerId =
      socialLoginDto.provider === 'google'
        ? await this.verifyGoogleToken(socialLoginDto.token)
        : await this.verifyKakaoToken(socialLoginDto.token);

    // 2. DB에서 사용자 조회
    let user = await this.usersService.findByProvider(
      socialLoginDto.provider,
      providerId,
    );

    // 3. 없으면 에러 (가입 프로세스는 별도로 두거나 여기서 자동 가입 가능)
    if (!user) {
      throw new UnauthorizedException('Social account is not registered. Please sign up first.');
    }

    return this.buildAuthResponse(user);
  }

  async validateUser(payload: any) {
    return await this.usersService.findOne(payload.sub);
  }

  async changePassword(userId: string, changePasswordDto: any) {
    const user = (await this.usersService.findOne(userId)) as any;
    // user는 이미 findOne에서 존재 여부가 확인됨 (비밀번호 없는 소셜 사용자는 password_hash가 null)
    if (!user.password_hash) {
      throw new UnauthorizedException(
        'Social accounts do not have a password. Please use social login.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      salt,
    );

    await this.usersService.update(userId, {
      password_hash: newPasswordHash,
    } as any);

    return { message: 'Password changed successfully' };
  }

  private buildAuthResponse(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  private async verifyGoogleToken(token: string) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const data = (await response.json()) as { sub?: string; aud?: string };
    const expectedAudience = process.env.GOOGLE_CLIENT_ID;
    if (!data.sub) {
      throw new UnauthorizedException('Invalid Google token payload');
    }
    // 환경변수에 설정된 경우에만 검증
    if (expectedAudience && data.aud !== expectedAudience) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    return data.sub;
  }

  private async verifyKakaoToken(token: string) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Kakao token');
    }

    const data = (await response.json()) as { id?: number | string };
    if (!data.id) {
      throw new UnauthorizedException('Invalid Kakao token payload');
    }

    return String(data.id);
  }
}
