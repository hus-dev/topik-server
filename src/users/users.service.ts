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

  async create(createUserDto: CreateUserDto & { password_hash?: string }) {
    const now = BigInt(Date.now());
    const { password, password_hash, ...userData } = createUserDto;
    
    const user = await this.prisma.users.create({
      data: {
        ...userData,
        password_hash: password_hash,
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

  // Only for internal Auth use
  async findForAuth(email: string) {
    return await this.prisma.users.findFirst({
      where: { email },
    });
  }

  async findByProviderAndId(provider: string, provider_id: string) {
    const user = await this.prisma.users.findUnique({
      where: {
        provider_provider_id: {
          provider,
          provider_id,
        },
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
