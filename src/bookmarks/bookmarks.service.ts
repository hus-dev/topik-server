import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
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

  async getSummary(userId: string) {
    const [questions, vocabulary, grammar] = await this.prisma.$transaction([
      this.prisma.answers.count({
        where: {
          bookmarked: 1,
          exam_sessions: {
            user_id: userId,
          },
        },
      }),
      this.prisma.user_vocabulary.count({
        where: {
          user_id: userId,
          is_bookmarked: 1,
        },
      }),
      this.prisma.user_grammar_items.count({
        where: {
          user_id: userId,
          is_bookmarked: 1,
        },
      }),
    ]);

    return {
      questions,
      vocabulary,
      grammar,
    };
  }

  async getQuestions(userId: string) {
    const bookmarks = await this.prisma.answers.findMany({
      where: {
        bookmarked: 1,
        exam_sessions: {
          user_id: userId,
        },
      },
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
            question_sets: true,
          },
        },
        exam_sessions: {
          select: {
            id: true,
            mode: true,
            section: true,
            status: true,
            started_at: true,
            submitted_at: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return this.serializeData(bookmarks);
  }

  async updateQuestion(userId: string, questionId: string, bookmarked: boolean) {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      select: {
        id: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const existingAnswer = await this.prisma.answers.findFirst({
      where: {
        question_id: questionId,
        exam_sessions: {
          user_id: userId,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!existingAnswer) {
      throw new NotFoundException(
        'Question bookmark requires an existing practice answer for this user',
      );
    }

    const answer = await this.prisma.answers.update({
      where: { id: existingAnswer.id },
      data: {
        bookmarked: bookmarked ? 1 : 0,
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(answer);
  }

  async getVocabulary(userId: string) {
    const bookmarks = await this.prisma.user_vocabulary.findMany({
      where: {
        user_id: userId,
        is_bookmarked: 1,
      },
      include: {
        vocabulary: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    return this.serializeData(bookmarks);
  }

  async updateVocabulary(
    userId: string,
    vocabularyId: string,
    bookmarked: boolean,
  ) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
      select: {
        id: true,
      },
    });

    if (!vocabulary) {
      throw new NotFoundException(`Vocabulary with ID ${vocabularyId} not found`);
    }

    const now = BigInt(Date.now());
    const bookmark = await this.prisma.user_vocabulary.upsert({
      where: {
        user_id_vocabulary_id: {
          user_id: userId,
          vocabulary_id: vocabularyId,
        },
      },
      create: {
        user_id: userId,
        vocabulary_id: vocabularyId,
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
      update: {
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
    });

    return this.serializeData(bookmark);
  }

  async getGrammar(userId: string) {
    const bookmarks = await this.prisma.user_grammar_items.findMany({
      where: {
        user_id: userId,
        is_bookmarked: 1,
      },
      include: {
        grammar_items: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    return this.serializeData(bookmarks);
  }

  async updateGrammar(userId: string, grammarId: string, bookmarked: boolean) {
    const grammar = await this.prisma.grammar_items.findUnique({
      where: { id: grammarId },
      select: {
        id: true,
      },
    });

    if (!grammar) {
      throw new NotFoundException(`Grammar item with ID ${grammarId} not found`);
    }

    const now = BigInt(Date.now());
    const bookmark = await this.prisma.user_grammar_items.upsert({
      where: {
        user_id_grammar_item_id: {
          user_id: userId,
          grammar_item_id: grammarId,
        },
      },
      create: {
        user_id: userId,
        grammar_item_id: grammarId,
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
      update: {
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
    });

    return this.serializeData(bookmark);
  }
}
