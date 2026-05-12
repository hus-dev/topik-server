import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMockExamSessionDto } from './dto/create-mock-exam-session.dto';
import { SaveMockExamAnswerDto } from './dto/save-mock-exam-answer.dto';
import { UpdateMockExamProgressDto } from './dto/update-mock-exam-progress.dto';

@Injectable()
export class MockExamsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeData(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeData(item));
    }

    if (typeof data === 'bigint') {
      return data.toString();
    }

    if (typeof data === 'object') {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>,
      )) {
        serialized[key] = this.serializeData(value);
      }
      return serialized;
    }

    return data;
  }

  private async findOwnedSession(userId: string, sessionId: string) {
    const session = await this.prisma.exam_sessions.findFirst({
      where: {
        id: sessionId,
        mode: 'mock',
      },
    });

    if (!session) {
      throw new NotFoundException(
        `Mock exam session with ID ${sessionId} not found`,
      );
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }

    return session;
  }

  private async loadSessionQuestions(sessionId: string) {
    const session = await this.prisma.exam_sessions.findUnique({
      where: { id: sessionId },
      select: {
        set_id: true,
      },
    });

    if (!session?.set_id) {
      return [];
    }

    return this.prisma.questions.findMany({
      where: {
        set_id: session.set_id,
      },
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
    dto: SaveMockExamAnswerDto,
  ) {
    if (!question.correct_answer) return null;

    const submitted = this.normalizeAnswer(
      dto.selected_answer ?? dto.text_answer,
    );
    const correct = this.normalizeAnswer(question.correct_answer);

    if (!submitted || !correct) return null;

    return submitted === correct ? 1 : 0;
  }

  async create(userId: string, dto: CreateMockExamSessionDto) {
    const set = await this.prisma.question_sets.findUnique({
      where: { id: dto.set_id },
    });

    if (!set) {
      throw new NotFoundException(
        `QuestionSet with ID ${dto.set_id} not found`,
      );
    }

    const questions = await this.prisma.questions.findMany({
      where: { set_id: dto.set_id },
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

    if (questions.length === 0) {
      throw new BadRequestException('No questions found for this mock exam');
    }

    const now = BigInt(Date.now());
    const session = await this.prisma.exam_sessions.create({
      data: {
        user_id: userId,
        mode: 'mock',
        section: set.section,
        set_id: set.id,
        total_questions: questions.length,
        current_index: 0,
        remaining_seconds: dto.remaining_seconds ?? 4200,
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
    }) as Promise<unknown>;
  }

  async getActive(userId: string) {
    const session = await this.prisma.exam_sessions.findFirst({
      where: {
        user_id: userId,
        mode: 'mock',
        status: 'in_progress',
      },
      orderBy: { started_at: 'desc' },
    });

    if (!session) {
      return null;
    }

    const [questions, answers] = await Promise.all([
      this.loadSessionQuestions(session.id),
      this.prisma.answers.findMany({
        where: { session_id: session.id },
        orderBy: { updated_at: 'asc' },
      }),
    ]);

    return this.serializeData({
      session,
      questions,
      answers,
    }) as Promise<unknown>;
  }

  async findOne(userId: string, sessionId: string) {
    const session = await this.findOwnedSession(userId, sessionId);
    const [questions, answers] = await Promise.all([
      this.loadSessionQuestions(session.id),
      this.prisma.answers.findMany({
        where: { session_id: session.id },
        orderBy: { updated_at: 'asc' },
      }),
    ]);

    return this.serializeData({
      session,
      questions,
      answers,
    }) as Promise<unknown>;
  }

  async updateProgress(
    userId: string,
    sessionId: string,
    dto: UpdateMockExamProgressDto,
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

    return this.serializeData(session) as Promise<unknown>;
  }

  async saveAnswer(
    userId: string,
    sessionId: string,
    dto: SaveMockExamAnswerDto,
  ) {
    const session = await this.findOwnedSession(userId, sessionId);

    if (session.status === 'submitted') {
      throw new BadRequestException('Submitted sessions cannot be changed');
    }

    const question = await this.prisma.questions.findUnique({
      where: { id: dto.question_id },
      select: {
        id: true,
        set_id: true,
        correct_answer: true,
      },
    });

    if (!question) {
      throw new NotFoundException(
        `Question with ID ${dto.question_id} not found`,
      );
    }

    if (question.set_id !== session.set_id) {
      throw new BadRequestException(
        'Question does not belong to this mock exam',
      );
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

    return this.serializeData(answer) as Promise<unknown>;
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
    const correct_count = answers.filter(
      (answer) => answer.is_correct === 1,
    ).length;
    const incorrect_count = answers.filter(
      (answer) => answer.is_correct === 0,
    ).length;
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
    }) as Promise<unknown>;
  }
}
