import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

  private buildAuthResponse(user: any) {
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
