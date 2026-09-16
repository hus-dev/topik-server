import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';

interface JwtRequest extends Request {
  user: {
    userId: string;
    role?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('social-login')
  @ApiOperation({ summary: 'Social login with Google or Kakao token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in with social account',
  })
  async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
    return this.authService.socialSignIn(socialLoginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token using Refresh Token' })
  @ApiResponse({ status: 200, description: 'Successfully refreshed token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req: JwtRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() body?: { refreshToken?: string }) {
    return this.authService.logout(body?.refreshToken);
  }
}
