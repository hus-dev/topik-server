import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';

@Injectable()
export class QuestionSetsService {
  constructor(private prisma: PrismaService) {}

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
        created_at: now,
        updated_at: now,
      },
    });
    return this.serializeData(set);
  }

  async findAll() {
    const sets = await this.prisma.question_sets.findMany({
      orderBy: { created_at: 'desc' },
    });
    return sets.map((set) => this.serializeData(set));
  }

  async findOne(id: string) {
    const set = await this.prisma.question_sets.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question_options: true,
            question_media: true,
            question_passages: true,
          },
        },
        exam_sessions: true,
      },
    });
    if (!set) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
    return this.serializeData(set);
  }

  async update(id: string, updateQuestionSetDto: UpdateQuestionSetDto) {
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
    try {
      const set = await this.prisma.question_sets.delete({
        where: { id },
      });
      return this.serializeData(set);
    } catch (error) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
  }
}
