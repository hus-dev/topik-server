import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExplanationVideoDto } from './dto/create-explanation-video.dto';
import { GetExplanationVideosQueryDto } from './dto/get-explanation-videos.query';

type ExplanationVideoRecord = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  video_url: string;
  question_id: string | null;
  set_id: string | null;
  section: string | null;
  level: number | null;
  is_recommended: number;
  display_order: number;
  created_at: bigint;
  updated_at: bigint;
  questions?: {
    id: string;
    question_number: number;
    prompt: string;
    section: string;
    question_type: string;
  } | null;
  question_sets?: {
    id: string;
    title: string | null;
    section: string;
    level: number;
    exam_kind: string;
  } | null;
};

@Injectable()
export class ExplanationVideosService {
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

  private now() {
    return BigInt(Date.now());
  }

  private withComputedFields(video: ExplanationVideoRecord) {
    const targetType = video.question_id
      ? 'question'
      : video.set_id
        ? 'set'
        : 'general';

    const targetTitle = video.questions
      ? `Question ${video.questions.question_number}`
      : (video.question_sets?.title ??
        video.set_id ??
        video.question_id ??
        null);

    const targetDescription = video.questions
      ? video.questions.prompt
      : video.question_sets
        ? `${video.question_sets.section} / level ${video.question_sets.level}`
        : null;

    return {
      ...video,
      target_type: targetType,
      target_title: targetTitle,
      target_description: targetDescription,
    };
  }

  private buildWhere(
    query?: GetExplanationVideosQueryDto,
  ): Prisma.explanation_videosWhereInput {
    return {
      ...(query?.section ? { section: query.section } : {}),
      ...(query?.level !== undefined ? { level: query.level } : {}),
      ...(query?.question_id ? { question_id: query.question_id } : {}),
      ...(query?.set_id ? { set_id: query.set_id } : {}),
    };
  }

  private async loadWithRelations(where: Prisma.explanation_videosWhereInput) {
    return this.prisma.explanation_videos.findMany({
      where,
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      include: {
        questions: {
          select: {
            id: true,
            question_number: true,
            prompt: true,
            section: true,
            question_type: true,
          },
        },
        question_sets: {
          select: {
            id: true,
            title: true,
            section: true,
            level: true,
            exam_kind: true,
          },
        },
      },
    });
  }

  async findAll(query: GetExplanationVideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.explanation_videos.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
        include: {
          questions: {
            select: {
              id: true,
              question_number: true,
              prompt: true,
              section: true,
              question_type: true,
            },
          },
          question_sets: {
            select: {
              id: true,
              title: true,
              section: true,
              level: true,
              exam_kind: true,
            },
          },
        },
      }),
      this.prisma.explanation_videos.count({ where }),
    ]);

    return this.serializeData({
      items: items.map((item) => this.withComputedFields(item)),
      page,
      limit,
      total,
    });
  }

  async findRecommended() {
    const items = await this.prisma.explanation_videos.findMany({
      where: { is_recommended: 1 },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      include: {
        questions: {
          select: {
            id: true,
            question_number: true,
            prompt: true,
            section: true,
            question_type: true,
          },
        },
        question_sets: {
          select: {
            id: true,
            title: true,
            section: true,
            level: true,
            exam_kind: true,
          },
        },
      },
    });

    return this.serializeData(
      items.map((item) => this.withComputedFields(item)),
    );
  }

  async findOne(id: string) {
    const video = await this.prisma.explanation_videos.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            question_number: true,
            prompt: true,
            section: true,
            question_type: true,
          },
        },
        question_sets: {
          select: {
            id: true,
            title: true,
            section: true,
            level: true,
            exam_kind: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException(`Explanation video with ID ${id} not found`);
    }

    return this.serializeData(this.withComputedFields(video));
  }

  async create(createDto: CreateExplanationVideoDto) {
    if (!createDto.question_id && !createDto.set_id) {
      throw new BadRequestException(
        'Either question_id or set_id must be provided',
      );
    }

    if (createDto.question_id) {
      const question = await this.prisma.questions.findUnique({
        where: { id: createDto.question_id },
        select: { id: true },
      });

      if (!question) {
        throw new NotFoundException(
          `Question with ID ${createDto.question_id} not found`,
        );
      }
    }

    if (createDto.set_id) {
      const questionSet = await this.prisma.question_sets.findUnique({
        where: { id: createDto.set_id },
        select: { id: true },
      });

      if (!questionSet) {
        throw new NotFoundException(
          `Question set with ID ${createDto.set_id} not found`,
        );
      }
    }

    const now = this.now();
    const video = await this.prisma.explanation_videos.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        thumbnail_url: createDto.thumbnail_url ?? null,
        video_url: createDto.video_url,
        question_id: createDto.question_id ?? null,
        set_id: createDto.set_id ?? null,
        section: createDto.section ?? null,
        level: createDto.level ?? null,
        is_recommended: createDto.is_recommended ?? 0,
        display_order: createDto.display_order ?? 0,
        created_at: now,
        updated_at: now,
      },
      include: {
        questions: {
          select: {
            id: true,
            question_number: true,
            prompt: true,
            section: true,
            question_type: true,
          },
        },
        question_sets: {
          select: {
            id: true,
            title: true,
            section: true,
            level: true,
            exam_kind: true,
          },
        },
      },
    });

    return this.serializeData(this.withComputedFields(video));
  }

  async remove(id: string) {
    const existing = await this.prisma.explanation_videos.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Explanation video with ID ${id} not found`);
    }

    const video = await this.prisma.explanation_videos.delete({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            question_number: true,
            prompt: true,
            section: true,
            question_type: true,
          },
        },
        question_sets: {
          select: {
            id: true,
            title: true,
            section: true,
            level: true,
            exam_kind: true,
          },
        },
      },
    });

    return this.serializeData(this.withComputedFields(video));
  }
}
