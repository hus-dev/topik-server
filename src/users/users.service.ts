import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private serializeUser(user: any) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async create(
    createUserDto: Partial<CreateUserDto> & {
      email?: string | null;
      nickname: string;
      password_hash?: string | null;
      provider?: string;
      provider_id?: string | null;
      target_level?: number;
      language_code?: string;
      timezone?: string;
      timer_mode?: string;
    },
  ) {
    const now = BigInt(Date.now());
    const provider = createUserDto.provider || 'local';

    if (provider === 'local' && !createUserDto.password_hash) {
      throw new BadRequestException('Local users require password_hash');
    }

    const user = await this.prisma.users.create({
      data: {
        email: createUserDto.email || null,
        nickname: createUserDto.nickname,
        password_hash: createUserDto.password_hash || null,
        provider,
        provider_id: createUserDto.provider_id || null,
        role: 'user',
        target_level: createUserDto.target_level || 1,
        language_code: createUserDto.language_code || 'ko',
        timezone: createUserDto.timezone || 'Asia/Seoul',
        timer_mode: createUserDto.timer_mode || 'normal',
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
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async findByProvider(provider: string, providerId: string) {
    return this.prisma.users.findUnique({
      where: {
        provider_provider_id: {
          provider,
          provider_id: providerId,
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto | any) {
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
      return await this.prisma.$transaction(async (tx) => {
        // 1. Delete answers for user's exam sessions
        const sessions = await tx.exam_sessions.findMany({
          where: { user_id: id },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);
        if (sessionIds.length > 0) {
          await tx.answers.deleteMany({
            where: { session_id: { in: sessionIds } },
          });
        }

        // 2. Delete exam sessions
        await tx.exam_sessions.deleteMany({
          where: { user_id: id },
        });

        // 3. Delete user bookmarks & records
        await tx.user_vocabulary.deleteMany({
          where: { user_id: id },
        });
        await tx.user_grammar_items.deleteMany({
          where: { user_id: id },
        });
        await tx.user_questions.deleteMany({
          where: { user_id: id },
        });
        await tx.user_downloads.deleteMany({
          where: { user_id: id },
        });
        await tx.sync_queue.deleteMany({
          where: { user_id: id },
        });

        // 4. Delete the user
        const user = await tx.users.delete({
          where: { id },
        });

        return this.serializeUser(user);
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
