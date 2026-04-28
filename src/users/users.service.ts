import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // BigInt를 JSON으로 직렬화할 때 발생하는 문제를 해결하기 위한 헬퍼 함수
  private serializeUser(user: any) {
    const { password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      created_at: safeUser.created_at?.toString(),
      updated_at: safeUser.updated_at?.toString(),
    };
  }

  async create(createUserDto: CreateUserDto) {
    const now = BigInt(Date.now());
    const user = await this.prisma.users.create({
      data: {
        ...createUserDto,
        created_at: now,
        updated_at: now,
      },
    });
    return this.serializeUser(user);
  }

  async findAll() {
    const users = await this.prisma.users.findMany();
    return users.map((user) => this.serializeUser(user));
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
    return user ? this.serializeUser(user) : null;
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
