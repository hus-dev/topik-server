import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMockExamSessionDto } from './dto/create-mock-exam-session.dto';
import { SaveMockExamAnswerDto } from './dto/save-mock-exam-answer.dto';
import { UpdateMockExamProgressDto } from './dto/update-mock-exam-progress.dto';
import { EXAM_KIND } from '../common/exam-kind';

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

  private formatDuration(seconds: number) {
    const totalMinutes = Math.max(0, Math.floor(seconds / 60));
    const remainingSeconds = Math.max(0, seconds % 60);
    return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private getQuestionCount(
    set: { total_questions: number },
    fallbackCount: number,
  ) {
    return set.total_questions > 0 ? set.total_questions : fallbackCount;
  }

  private mapQuestionSetCard(
    set: {
      id: string;
      title: string | null;
      section: string;
      level: number;
      exam_kind: string;
      total_questions: number;
      duration_seconds: number;
      price: number;
      is_free: number;
      display_order: number;
      _count?: { questions: number };
    },
    fallbackQuestionCount: number,
  ) {
    const totalQuestions = this.getQuestionCount(
      set,
      set._count?.questions ?? fallbackQuestionCount,
    );
    const durationSeconds =
      set.duration_seconds > 0 ? set.duration_seconds : 4200;
    const isFree = set.is_free === 1 || set.price === 0;

    return {
      id: set.id,
      title: set.title,
      section: set.section,
      level: set.level,
      exam_kind: set.exam_kind,
      total_questions: totalQuestions,
      duration_seconds: durationSeconds,
      duration_label: this.formatDuration(durationSeconds),
      price: set.price,
      is_free: isFree,
      price_label: isFree ? 'free' : set.price.toString(),
      display_order: set.display_order,
    };
  }

  private buildCatalogTabs(
    questionSets: Array<{
      id: string;
      title: string | null;
      section: string;
      level: number;
      exam_kind: string;
      total_questions: number;
      duration_seconds: number;
      price: number;
      is_free: number;
      display_order: number;
      _count?: { questions: number };
    }>,
  ) {
    const readingMock = questionSets
      .filter(
        (set) => set.section === 'reading' && set.exam_kind === EXAM_KIND.MOCK,
      )
      .sort((left, right) => left.display_order - right.display_order)
      .map((set) => this.mapQuestionSetCard(set, 50));

    const readingType = questionSets
      .filter(
        (set) => set.section === 'reading' && set.exam_kind === EXAM_KIND.TYPE,
      )
      .sort((left, right) => left.display_order - right.display_order)
      .map((set) => this.mapQuestionSetCard(set, 30));

    const listeningMock = questionSets
      .filter(
        (set) =>
          set.section === 'listening' && set.exam_kind === EXAM_KIND.MOCK,
      )
      .sort((left, right) => left.display_order - right.display_order)
      .map((set) => this.mapQuestionSetCard(set, 50));

    const listeningType = questionSets
      .filter(
        (set) =>
          set.section === 'listening' && set.exam_kind === EXAM_KIND.TYPE,
      )
      .sort((left, right) => left.display_order - right.display_order)
      .map((set) => this.mapQuestionSetCard(set, 10));

    return {
      reading_mock: readingMock,
      reading_type: readingType,
      listening_mock: listeningMock,
      listening_type: listeningType,
      difficulty_levels: [3, 4, 5, 6],
    };
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
    const activeSession = await this.prisma.exam_sessions.findFirst({
      where: {
        user_id: userId,
        mode: 'mock',
        status: 'in_progress',
      },
      select: {
        id: true,
      },
    });

    if (activeSession) {
      throw new ConflictException('Active mock exam session already exists');
    }

    const set = await this.prisma.question_sets.findUnique({
      where: { id: dto.set_id },
    });

    if (!set) {
      throw new NotFoundException(
        `QuestionSet with ID ${dto.set_id} not found`,
      );
    }

    if (set.exam_kind !== EXAM_KIND.MOCK) {
      throw new BadRequestException(
        `QuestionSet ${dto.set_id} is not a mock exam set`,
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
        total_questions: this.getQuestionCount(
          {
            total_questions: set.total_questions,
          },
          questions.length,
        ),
        current_index: 0,
        remaining_seconds:
          dto.remaining_seconds ?? set.duration_seconds ?? 4200,
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
    });
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
    });
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
    });
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

    return this.serializeData(session);
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

    if (dto.bookmarked !== undefined) {
      await this.prisma.user_questions.upsert({
        where: {
          user_id_question_id: {
            user_id: userId,
            question_id: dto.question_id,
          },
        },
        create: {
          user_id: userId,
          question_id: dto.question_id,
          is_bookmarked: dto.bookmarked,
          updated_at: now,
        },
        update: {
          is_bookmarked: dto.bookmarked,
          updated_at: now,
        },
      });
    }

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
    });
  }

  async getCatalog(userId: string) {
    const [activeSession, questionSets] = await Promise.all([
      this.prisma.exam_sessions.findFirst({
        where: {
          user_id: userId,
          mode: 'mock',
          status: 'in_progress',
        },
        orderBy: { started_at: 'desc' },
        include: {
          question_sets: true,
        },
      }),
      this.prisma.question_sets.findMany({
        where: {
          exam_kind: {
            in: [EXAM_KIND.MOCK, EXAM_KIND.TYPE],
          },
        },
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
        orderBy: [
          { section: 'asc' },
          { exam_kind: 'asc' },
          { display_order: 'asc' },
        ],
      }),
    ]);

    const active = activeSession
      ? {
          session_id: activeSession.id,
          title: activeSession.question_sets?.title ?? '모의고사',
          set_id: activeSession.set_id,
          section: activeSession.section,
          remaining_questions: Math.max(
            activeSession.total_questions - activeSession.current_index,
            0,
          ),
          total_questions: activeSession.total_questions,
          remaining_seconds: activeSession.remaining_seconds,
          remaining_time_label: this.formatDuration(
            activeSession.remaining_seconds,
          ),
          current_index: activeSession.current_index,
        }
      : null;

    return this.serializeData({
      active_session: active,
      tabs: this.buildCatalogTabs(questionSets),
    });
  }
}
