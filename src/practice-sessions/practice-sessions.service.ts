import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { SavePracticeAnswerDto } from './dto/save-practice-answer.dto';
import { UpdatePracticeProgressDto } from './dto/update-practice-progress.dto';

@Injectable()
export class PracticeSessionsService {
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

  private async findOwnedSession(userId: string, sessionId: string) {
    const session = await this.prisma.exam_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Practice session with ID ${sessionId} not found`);
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    return session;
  }

  private buildQuestionWhere(
    dto: CreatePracticeSessionDto,
  ): Prisma.questionsWhereInput {
    return {
      ...(dto.set_id ? { set_id: dto.set_id } : {}),
      ...(!dto.set_id ? { section: dto.section } : {}),
      ...(dto.level !== undefined ? { level: dto.level } : {}),
    };
  }

  private getSessionQuestions(sessionId: string, session: {
    set_id: string | null;
    section: string;
    total_questions: number;
  }) {
    return this.prisma.questions.findMany({
      where: {
        answers: {
          some: {
            session_id: sessionId,
          },
        },
      },
      take: session.total_questions,
      orderBy: [{ question_number: 'asc' }],
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
  }

  private normalizeAnswer(answer?: string | null) {
    return answer?.trim().toLowerCase() ?? null;
  }

  private calculateIsCorrect(
    question: { correct_answer: string | null },
    dto: SavePracticeAnswerDto,
  ) {
    if (!question.correct_answer) return null;

    const submitted = this.normalizeAnswer(dto.selected_answer ?? dto.text_answer);
    const correct = this.normalizeAnswer(question.correct_answer);

    if (!submitted || !correct) return null;

    return submitted === correct ? 1 : 0;
  }

  async create(userId: string, dto: CreatePracticeSessionDto) {
    const limit = dto.limit ?? 20;
    const questionWhere = this.buildQuestionWhere(dto);

    const [questions, totalMatching] = await this.prisma.$transaction([
      this.prisma.questions.findMany({
        where: questionWhere,
        take: limit,
        orderBy: [{ question_number: 'asc' }],
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
      this.prisma.questions.count({ where: questionWhere }),
    ]);

    if (totalMatching === 0) {
      throw new BadRequestException('No questions found for this practice session');
    }

    const now = BigInt(Date.now());
    const session = await this.prisma.exam_sessions.create({
      data: {
        user_id: userId,
        mode: dto.mode ?? 'practice',
        section: dto.section,
        set_id: dto.set_id,
        total_questions: questions.length,
        current_index: 0,
        remaining_seconds: dto.remaining_seconds ?? 0,
        status: 'in_progress',
        started_at: now,
        answers: {
          create: questions.map((question) => ({
            question_id: question.id,
            spent_seconds: 0,
            bookmarked: 0,
            updated_at: now,
          })),
        },
      },
    });

    return this.serializeData({
      session,
      questions,
      total_matching_questions: totalMatching,
    });
  }

  async findOne(userId: string, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    const [answers, questions] = await this.prisma.$transaction([
      this.prisma.answers.findMany({
        where: { session_id: sessionId },
        orderBy: { updated_at: 'asc' },
      }),
      this.getSessionQuestions(sessionId, session),
    ]);

    return this.serializeData({
      session,
      questions,
      answers,
    });
  }

  async updateProgress(
    userId: string,
    sessionId: string,
    dto: UpdatePracticeProgressDto,
  ) {
    await this.findOwnedSession(userId, sessionId);

    const session = await this.prisma.exam_sessions.update({
      where: { id: sessionId },
      data: {
        ...(dto.current_index !== undefined
          ? { current_index: dto.current_index }
          : {}),
        ...(dto.remaining_seconds !== undefined
          ? { remaining_seconds: dto.remaining_seconds }
          : {}),
      },
    });

    return this.serializeData(session);
  }

  async saveAnswer(userId: string, sessionId: string, dto: SavePracticeAnswerDto) {
    const session = await this.findOwnedSession(userId, sessionId);

    if (session.status === 'submitted') {
      throw new BadRequestException('Submitted sessions cannot be changed');
    }

    const question = await this.prisma.questions.findUnique({
      where: { id: dto.question_id },
      select: {
        id: true,
        set_id: true,
        section: true,
        correct_answer: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${dto.question_id} not found`);
    }

    if (session.set_id && question.set_id !== session.set_id) {
      throw new BadRequestException('Question does not belong to this session set');
    }

    if (!session.set_id && question.section !== session.section) {
      throw new BadRequestException('Question does not belong to this session section');
    }

    const now = BigInt(Date.now());
    const answer = await this.prisma.answers.upsert({
      where: {
        session_id_question_id: {
          session_id: sessionId,
          question_id: dto.question_id,
        },
      },
      create: {
        session_id: sessionId,
        question_id: dto.question_id,
        selected_answer: dto.selected_answer,
        text_answer: dto.text_answer,
        is_correct: this.calculateIsCorrect(question, dto),
        spent_seconds: dto.spent_seconds ?? 0,
        bookmarked: dto.bookmarked ?? 0,
        updated_at: now,
      },
      update: {
        selected_answer: dto.selected_answer,
        text_answer: dto.text_answer,
        is_correct: this.calculateIsCorrect(question, dto),
        spent_seconds: dto.spent_seconds ?? 0,
        bookmarked: dto.bookmarked ?? 0,
        updated_at: now,
      },
    });

    return this.serializeData(answer);
  }

  async submit(userId: string, sessionId: string) {
    await this.findOwnedSession(userId, sessionId);

    const now = BigInt(Date.now());
    await this.prisma.exam_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'submitted',
        submitted_at: now,
      },
    });

    return this.getResult(userId, sessionId);
  }

  async getResult(userId: string, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    const answers = await this.prisma.answers.findMany({
      where: { session_id: sessionId },
      include: {
        questions: {
          include: {
            question_options: {
              orderBy: { option_number: 'asc' },
            },
            question_media: {
              orderBy: { sort_order: 'asc' },
            },
            question_passages: true,
          },
        },
      },
      orderBy: { updated_at: 'asc' },
    });

    const answered_count = answers.filter(
      (answer) => answer.selected_answer || answer.text_answer,
    ).length;
    const correct_count = answers.filter((answer) => answer.is_correct === 1).length;
    const incorrect_count = answers.filter((answer) => answer.is_correct === 0).length;
    const score_percent =
      session.total_questions > 0
        ? Math.round((correct_count / session.total_questions) * 100)
        : 0;

    return this.serializeData({
      session,
      summary: {
        total_questions: session.total_questions,
        answered_count,
        correct_count,
        incorrect_count,
        score_percent,
      },
      answers,
    });
  }
}
