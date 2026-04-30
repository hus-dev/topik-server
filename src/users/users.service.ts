import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // BigInt를 JSON으로 직렬화할 때 발생하는 문제를 해결하기 위한 헬퍼 함수
  private serializeUser(user: any) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    
    // Iterate through properties and convert BigInt to string
    for (const key in safeUser) {
      if (typeof safeUser[key] === 'bigint') {
        safeUser[key] = safeUser[key].toString();
      }
    }
    
    return safeUser;
  }

  async create(createUserDto: CreateUserDto & { password_hash?: string }) {
    const now = BigInt(Date.now());
    const { password, password_hash, ...userData } = createUserDto as any;
    
    const user = await this.prisma.users.create({
      data: {
        ...userData,
        provider: userData.provider || 'local',
        target_level: userData.target_level || 1,
        language_code: userData.language_code || 'ko',
        timezone: userData.timezone || 'Asia/Seoul',
        timer_mode: userData.timer_mode || 'normal',
        password_hash: password_hash,
        created_at: now,
        updated_at: now,
      },
    });
    return this.serializeUser(user);
  }

  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.serializeUser(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email },
    });
    return user;
  }

  async findByProvider(provider: string, providerId: string) {
    const user = await this.prisma.users.findFirst({
      where: {
        provider,
        provider_id: providerId,
      },
    });
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const now = BigInt(Date.now());
      const user = await this.prisma.users.update({
        where: { id },
        data: {
          ...updateUserDto,
          updated_at: now,
        },
      });
      return this.serializeUser(user);
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      const user = await this.prisma.users.delete({
        where: { id },
      });
      return this.serializeUser(user);
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
