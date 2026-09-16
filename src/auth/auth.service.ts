import {
  ConflictException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface JwtPayload {
  email: string | null;
  sub: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
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
    const user = (await this.usersService.findByEmail(loginDto.email)) as any;
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

    let user = (await this.usersService.findByProvider(
      socialLoginDto.provider,
      providerId,
    )) as any;

    if (!user && email) {
      const existingEmailUser = (await this.usersService.findByEmail(
        email,
      )) as any;
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

  async validateUser(payload: JwtPayload) {
    return await this.usersService.findOne(payload.sub);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const userProfile = await this.usersService.findOne(userId);
    if (!userProfile || !userProfile.email) {
      throw new UnauthorizedException('User profile not found');
    }

    const user = (await this.usersService.findByEmail(
      userProfile.email,
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

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const userId = await this.redisService.get(`refresh_token:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Delete used refresh token (Token Rotation)
    await this.redisService.del(`refresh_token:${refreshToken}`);

    return this.buildAuthResponse(user as any);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.redisService.del(`refresh_token:${refreshToken}`);
    }
    return { message: 'Logged out successfully' };
  }

  private async buildAuthResponse(user: {
    email: string | null;
    id: string;
    role: string;
    nickname: string;
  }) {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = crypto.randomUUID();

    // Store in Redis (14 days)
    const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60;
    await this.redisService.set(
      `refresh_token:${refreshToken}`,
      user.id,
      REFRESH_TOKEN_TTL,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  private async verifyGoogleToken(token: string) {
    const allowedAudiences = this.getGoogleClientIds();
    if (allowedAudiences.length === 0) {
      throw new InternalServerErrorException(
        'Google login is not configured. Set GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS.',
      );
    }

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
        iss?: string;
        email?: string;
        name?: string;
        email_verified?: boolean | string;
      };

      if (!data.sub || !data.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      if (!data.aud || !allowedAudiences.includes(data.aud)) {
        throw new UnauthorizedException('Google token audience mismatch');
      }

      if (
        !data.iss ||
        (data.iss !== 'accounts.google.com' &&
          data.iss !== 'https://accounts.google.com')
      ) {
        throw new UnauthorizedException('Invalid Google token issuer');
      }

      if (String(data.email_verified) !== 'true') {
        throw new UnauthorizedException('Google account email is not verified');
      }

      return {
        sub: data.sub,
        email: data.email,
        name: data.name,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new UnauthorizedException('Google token verification timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getGoogleClientIds() {
    const rawValue =
      process.env.GOOGLE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? '';

    return rawValue
      .split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean);
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new UnauthorizedException('Kakao token verification timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
