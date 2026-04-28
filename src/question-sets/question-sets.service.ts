import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';

@Injectable()
export class QuestionSetsService {
  constructor(private prisma: PrismaService) {}

  private serializeSet(set: any) {
    return {
      ...set,
      created_at: set.created_at?.toString(),
      updated_at: set.updated_at?.toString(),
    };
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
    return this.serializeSet(set);
  }

  async findAll() {
    const sets = await this.prisma.question_sets.findMany({
      orderBy: { created_at: 'desc' },
    });
    return sets.map((set) => this.serializeSet(set));
  }

  async findOne(id: string) {
    const set = await this.prisma.question_sets.findUnique({
      where: { id },
      include: {
        exam_sessions: true,
      },
    });
    if (!set) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
    return this.serializeSet(set);
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
      return this.serializeSet(set);
    } catch (error) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      const set = await this.prisma.question_sets.delete({
        where: { id },
      });
      return this.serializeSet(set);
    } catch (error) {
      throw new NotFoundException(`QuestionSet with ID ${id} not found`);
    }
  }
}
