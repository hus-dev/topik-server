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
    const authProvider = provider || 'local';

    if (authProvider === 'local' && !password) {
      throw new BadRequestException('Password is required for local registration');
    }

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

    if (authProvider === 'local' && !password_hash) {
      throw new BadRequestException('Password hash could not be created');
    }

    // Create user
    const user = await this.usersService.create({
      ...createUserDto,
      provider: authProvider,
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
    // 1. 토큰 검증 및 소셜 정보 추출
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

    // 2. DB에서 사용자 조회
    let user = await this.usersService.findByProvider(
      socialLoginDto.provider,
      providerId,
    );

    // 3. 같은 이메일의 로컬 계정이 있으면 소셜 정보를 연결하고 기존 password_hash를 보존
    if (!user && email) {
      const existingEmailUser = await this.usersService.findByEmail(email);
      if (existingEmailUser) {
        user = await this.usersService.update(existingEmailUser.id, {
          provider: socialLoginDto.provider,
          provider_id: providerId,
        } as any);
      }
    }

    // 4. 없으면 자동 가입 (UI UX에 맞춰 바로 가입 처리)
    if (!user) {
      user = await this.usersService.create({
        email: email || null,
        provider: socialLoginDto.provider,
        provider_id: providerId,
        nickname: nickname || `${socialLoginDto.provider}_user`,
        target_level: 1, // 기본값
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

    const data = (await response.json()) as { 
      sub?: string; 
      aud?: string; 
      email?: string; 
      name?: string 
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
  }
}
