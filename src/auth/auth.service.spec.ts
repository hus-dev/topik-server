import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<any>;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';

    usersService = {
      findByProvider: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked_jwt_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_IDS;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Google Social Login Security Checks', () => {
    it('should throw UnauthorizedException when email_verified is boolean false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'google_123',
          aud: 'test-client-id',
          iss: 'https://accounts.google.com',
          email: 'attacker@gmail.com',
          name: 'Attacker',
          email_verified: false, // boolean false
        }),
      } as any);

      await expect(
        service.socialSignIn({ provider: 'google', token: 'valid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email_verified is string "false"', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'google_123',
          aud: 'test-client-id',
          iss: 'https://accounts.google.com',
          email: 'attacker@gmail.com',
          name: 'Attacker',
          email_verified: 'false',
        }),
      } as any);

      await expect(
        service.socialSignIn({ provider: 'google', token: 'valid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when aud does not match GOOGLE_CLIENT_ID', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'google_123',
          aud: 'wrong-client-id',
          iss: 'https://accounts.google.com',
          email: 'user@gmail.com',
          email_verified: true,
        }),
      } as any);

      await expect(
        service.socialSignIn({ provider: 'google', token: 'valid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed when email_verified is true and payload is valid', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'google_123',
          aud: 'test-client-id',
          iss: 'https://accounts.google.com',
          email: 'user@gmail.com',
          name: 'Valid User',
          email_verified: true,
        }),
      } as any);

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 'user_1',
        email: 'user@gmail.com',
        nickname: 'Valid User',
        role: 'user',
      });

      const result = await service.socialSignIn({
        provider: 'google',
        token: 'valid_token',
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe('user@gmail.com');
    });
  });
});
