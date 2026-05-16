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
      const serialized: Record<string, any> = {};
      for (const key in data) {
        const value = data[key];
        if (typeof value === 'bigint') {
          serialized[key] = value.toString();
        } else if (value !== null && typeof value === 'object') {
          serialized[key] = this.serializeData(value);
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  }

  async getSummary(userId: string) {
    const [questions, vocabulary, grammar] = await this.prisma.$transaction([
      this.prisma.user_questions.count({
        where: {
          user_id: userId,
          is_bookmarked: 1,
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
    const bookmarks = await this.prisma.user_questions.findMany({
      where: {
        user_id: userId,
        is_bookmarked: 1,
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
            answers: {
              where: {
                exam_sessions: {
                  user_id: userId,
                },
              },
              orderBy: { updated_at: 'desc' },
              take: 1,
              include: {
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
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return this.serializeData(
      bookmarks.map((b) => {
        const lastAnswer = b.questions.answers?.[0];
        const { answers: _unused_answers, ...questionData } = b.questions;
        return {
          id: b.id,
          question_id: b.question_id,
          bookmarked: b.is_bookmarked,
          updated_at: b.updated_at,
          questions: questionData,
          session_id: lastAnswer?.session_id || null,
          selected_answer: lastAnswer?.selected_answer || null,
          is_correct: lastAnswer?.is_correct || null,
          exam_sessions: lastAnswer?.exam_sessions || null,
        };
      }),
    );
  }

  async updateQuestion(
    userId: string,
    questionId: string,
    bookmarked: boolean,
  ) {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      select: {
        id: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const now = BigInt(Date.now());
    const bookmark = await this.prisma.user_questions.upsert({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      create: {
        user_id: userId,
        question_id: questionId,
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
      update: {
        is_bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
    });

    // Also update any existing answers to keep them in sync if necessary,
    // though user_questions is now the source of truth for the list.
    await this.prisma.answers.updateMany({
      where: {
        question_id: questionId,
        exam_sessions: {
          user_id: userId,
        },
      },
      data: {
        bookmarked: bookmarked ? 1 : 0,
        updated_at: now,
      },
    });

    return this.serializeData(bookmark);
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
      throw new NotFoundException(
        `Vocabulary with ID ${vocabularyId} not found`,
      );
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
      throw new NotFoundException(
        `Grammar item with ID ${grammarId} not found`,
      );
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
