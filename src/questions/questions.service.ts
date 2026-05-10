import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(query: GetQuestionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.questionsWhereInput = {
      ...(query.section ? { section: query.section } : {}),
      ...(query.level !== undefined ? { level: query.level } : {}),
      ...(query.question_type ? { question_type: query.question_type } : {}),
      ...(query.set_id ? { set_id: query.set_id } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.questions.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ section: 'asc' }, { question_number: 'asc' }],
        include: {
          question_options: {
            orderBy: { option_number: 'asc' },
          },
          question_media: {
            orderBy: { sort_order: 'asc' },
          },
          question_passages: true,
          question_sets: true,
        },
      }),
      this.prisma.questions.count({ where }),
    ]);

    return {
      items: this.serializeData(items),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.questions.findUnique({
      where: { id },
      include: {
        question_options: {
          orderBy: { option_number: 'asc' },
        },
        question_media: {
          orderBy: { sort_order: 'asc' },
        },
        question_passages: true,
        question_sets: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return this.serializeData(question);
  }
}
