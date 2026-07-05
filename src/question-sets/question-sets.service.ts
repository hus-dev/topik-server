import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { EXAM_KIND } from '../common/exam-kind';

@Injectable()
export class QuestionSetsService {
  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private serializeData(data: any): any {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeData(item));
    }

    if (typeof data === 'object') {
      const serialized: any = {};
      for (const key in data) {
        if (typeof data[key] === 'bigint') {
          serialized[key] = data[key].toString();
        } else if (typeof data[key] === 'object') {
          serialized[key] = this.serializeData(data[key]);
        } else {
          serialized[key] = data[key];
        }
      }
      return serialized;
    }

    return data;
  }

  async create(createQuestionSetDto: CreateQuestionSetDto) {
    const now = BigInt(Date.now());
    const set = await this.prisma.question_sets.create({
      data: {
        ...createQuestionSetDto,
        exam_kind: createQuestionSetDto.exam_kind ?? EXAM_KIND.PRACTICE,
        created_at: now,
        updated_at: now,
      },
    });

    // Invalidate list cache when new question set is created
    void this.redis.del('question-sets:list');

    return this.serializeData(set);
  }

  async findAll() {
    const cacheKey = 'question-sets:list';

    return this.redis.getOrSet(cacheKey, async () => {
      const sets = await this.prisma.question_sets.findMany({
        orderBy: { created_at: 'desc' },
      });
      return sets.map((set) => this.serializeData(set));
    }, 600); // 10 minute cache
  }

  async findOne(id: string) {
    const cacheKey = `question-sets:${id}`;

    const set = await this.redis.getOrSet(cacheKey, async () => {
      const s = await this.prisma.question_sets.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              question_options: true,
              question_media: true,
              question_passages: true,
            },
          },
        },
      });
      if (!s) {
        throw new NotFoundException(`QuestionSet with ID ${id} not found`);
      }
      return this.serializeData(s);
    }, 600); // 10 minute cache

    return set;
  }

  async update(id: string, updateQuestionSetDto: UpdateQuestionSetDto) {
    // Invalidate cache before update
    void this.redis.del(`question-sets:${id}`);
    void this.redis.del('question-sets:list');

    try {
      const now = BigInt(Date.now());
      const set = await this.prisma.question_sets.update({
        where: { id },
        data: {
          ...updateQuestionSetDto,
          updated_at: now,
        },
      });
      return this.serializeData(set);
    } catch (error) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    // Check existence and invalidate cache
    const existing = await this.prisma.question_sets.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }

    // Invalidate cache
    void this.redis.del(`question-sets:${id}`);
    void this.redis.del('question-sets:list');

    const set = await this.prisma.question_sets.delete({
      where: { id },
    });

    return this.serializeData(set);
  }
}
