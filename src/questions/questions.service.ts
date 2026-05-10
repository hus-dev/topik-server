import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

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

  private async validateQuestionRelations(data: {
    set_id?: string | null;
    passage_id?: string | null;
  }) {
    if (data.set_id) {
      const set = await this.prisma.question_sets.findUnique({
        where: { id: data.set_id },
        select: { id: true },
      });

      if (!set) {
        throw new NotFoundException(
          `Question set with ID ${data.set_id} not found`,
        );
      }
    }

    if (data.passage_id) {
      const passage = await this.prisma.question_passages.findUnique({
        where: { id: data.passage_id },
        select: { id: true },
      });

      if (!passage) {
        throw new NotFoundException(
          `Question passage with ID ${data.passage_id} not found`,
        );
      }
    }
  }

  async create(createQuestionDto: CreateQuestionDto) {
    const { question_options, question_media, ...questionData } =
      createQuestionDto;
    const now = BigInt(Date.now());

    await this.validateQuestionRelations(questionData);

    const question = await this.prisma.questions.create({
      data: {
        ...questionData,
        created_at: now,
        updated_at: now,
        question_options: question_options?.length
          ? {
              create: question_options.map((option) => ({
                option_number: option.option_number,
                content: option.content,
                is_correct: option.is_correct ?? 0,
              })),
            }
          : undefined,
        question_media: question_media?.length
          ? {
              create: question_media.map((media) => ({
                media_type: media.media_type,
                url: media.url,
                duration_seconds: media.duration_seconds,
                transcript: media.transcript,
                sort_order: media.sort_order ?? 1,
                created_at: now,
                updated_at: now,
              })),
            }
          : undefined,
      },
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

    return this.serializeData(question);
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    await this.findOne(id);

    const { question_options, question_media, ...questionData } =
      updateQuestionDto;
    const now = BigInt(Date.now());

    await this.validateQuestionRelations(questionData);

    const question = await this.prisma.$transaction(async (tx) => {
      if (question_options) {
        await tx.question_options.deleteMany({
          where: { question_id: id },
        });
      }

      if (question_media) {
        await tx.question_media.deleteMany({
          where: { question_id: id },
        });
      }

      return tx.questions.update({
        where: { id },
        data: {
          ...questionData,
          updated_at: now,
          question_options: question_options?.length
            ? {
                create: question_options.map((option) => ({
                  option_number: option.option_number,
                  content: option.content,
                  is_correct: option.is_correct ?? 0,
                })),
              }
            : undefined,
          question_media: question_media?.length
            ? {
                create: question_media.map((media) => ({
                  media_type: media.media_type,
                  url: media.url,
                  duration_seconds: media.duration_seconds,
                  transcript: media.transcript,
                  sort_order: media.sort_order ?? 1,
                  created_at: now,
                  updated_at: now,
                })),
              }
            : undefined,
        },
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
    });

    return this.serializeData(question);
  }

  async remove(id: string) {
    await this.findOne(id);

    const question = await this.prisma.$transaction(async (tx) => {
      await tx.question_options.deleteMany({
        where: { question_id: id },
      });
      await tx.question_media.deleteMany({
        where: { question_id: id },
      });

      return tx.questions.delete({
        where: { id },
      });
    });

    return this.serializeData(question);
  }
}
