import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, nickname, password } = createUserDto;

    // 1. 이메일 중복 체크
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. 비밀번호 해싱
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(password, salt);

    // 3. 사용자 생성 (기본 설정 포함)
    const user = await this.usersService.create({
      email,
      nickname,
      password_hash,
      provider: 'local',
      provider_id: null,
      target_level: 1,
      language_code: 'ko',
      timezone: 'Asia/Seoul',
      timer_mode: 'normal',
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
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
    let providerId: string;
    let email: string | undefined;
    let nickname: string | undefined;

    if (socialLoginDto.provider === 'google') {
      const googleUser = await this.verifyGoogleToken(socialLoginDto.token);
      providerId = googleUser.sub;
      email = googleUser.email;
      nickname = googleUser.name;
    } else {
      const kakaoUser = await this.verifyKakaoToken(socialLoginDto.token);
      providerId = kakaoUser.id;
      email = kakaoUser.email;
      nickname = kakaoUser.nickname;
    }

    let user = await this.usersService.findByProvider(
      socialLoginDto.provider,
      providerId,
    );

    if (!user && email) {
      const existingEmailUser = await this.usersService.findByEmail(email);
      if (existingEmailUser) {
        user = await this.usersService.update(existingEmailUser.id, {
          provider: socialLoginDto.provider,
          provider_id: providerId,
        });
      }
    }

    if (!user) {
      user = await this.usersService.create({
        email: email || null,
        provider: socialLoginDto.provider,
        provider_id: providerId,
        nickname: nickname || `${socialLoginDto.provider}_user`,
        target_level: 1,
        language_code: 'ko',
        timezone: 'Asia/Seoul',
        timer_mode: 'normal',
      } as any);
    }

    return this.buildAuthResponse(user);
  }

  async validateUser(payload: any) {
    return await this.usersService.findOne(payload.sub);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = (await this.usersService.findByEmail(
      (await this.usersService.findOne(userId)).email,
    )) as any;

    if (!user || !user.password_hash) {
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
    });

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const data = (await response.json()) as {
        sub?: string;
        aud?: string;
        email?: string;
        name?: string;
      };
      const expectedAudience = process.env.GOOGLE_CLIENT_ID;

      if (!data.sub) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      if (expectedAudience && data.aud !== expectedAudience) {
        throw new UnauthorizedException('Google token audience mismatch');
      }

      return {
        sub: data.sub,
        email: data.email,
        name: data.name,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new UnauthorizedException('Google token verification timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async verifyKakaoToken(token: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Kakao token');
      }

      const data = (await response.json()) as {
        id?: number | string;
        kakao_account?: {
          email?: string;
          profile?: {
            nickname?: string;
          };
        };
      };

      if (!data.id) {
        throw new UnauthorizedException('Invalid Kakao token payload');
      }

      return {
        id: String(data.id),
        email: data.kakao_account?.email,
        nickname: data.kakao_account?.profile?.nickname,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new UnauthorizedException('Kakao token verification timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
