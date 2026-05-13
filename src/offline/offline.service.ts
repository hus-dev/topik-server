import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetOfflineItemsQueryDto } from './dto/get-offline-items.query';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { OFFLINE_ENTITY_TYPES } from './dto/get-offline-items.query';

type OfflineEntityType = (typeof OFFLINE_ENTITY_TYPES)[number];
type OfflineStatus = 'downloaded' | 'pending' | 'failed';

@Injectable()
export class OfflineService {
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

  private async ensureEntityExists(
    entityType: OfflineEntityType,
    entityId: string,
  ) {
    if (entityType === 'question') {
      const question = await this.prisma.questions.findUnique({
        where: { id: entityId },
        select: { id: true },
      });

      if (!question) {
        throw new NotFoundException(`Question with ID ${entityId} not found`);
      }

      return;
    }

    if (entityType === 'vocabulary') {
      const vocabulary = await this.prisma.vocabulary.findUnique({
        where: { id: entityId },
        select: { id: true },
      });

      if (!vocabulary) {
        throw new NotFoundException(`Vocabulary with ID ${entityId} not found`);
      }

      return;
    }

    if (entityType === 'grammar') {
      const grammar = await this.prisma.grammar_items.findUnique({
        where: { id: entityId },
        select: { id: true },
      });

      if (!grammar) {
        throw new NotFoundException(
          `Grammar item with ID ${entityId} not found`,
        );
      }
    }
  }

  private buildWhere(
    userId: string,
    query?: GetOfflineItemsQueryDto,
  ): Prisma.user_downloadsWhereInput {
    return {
      user_id: userId,
      ...(query?.entity_type ? { entity_type: query.entity_type } : {}),
      ...(query?.status ? { status: query.status } : {}),
    };
  }

  private async loadContentByType(
    entityType: OfflineEntityType,
    entityIds: string[],
  ) {
    if (entityIds.length === 0) {
      return new Map<string, unknown>();
    }

    if (entityType === 'question') {
      const questions = await this.prisma.questions.findMany({
        where: { id: { in: entityIds } },
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

      return new Map(questions.map((question) => [question.id, question]));
    }

    if (entityType === 'vocabulary') {
      const vocabulary = await this.prisma.vocabulary.findMany({
        where: { id: { in: entityIds } },
      });

      return new Map(vocabulary.map((item) => [item.id, item]));
    }

    const grammar = await this.prisma.grammar_items.findMany({
      where: { id: { in: entityIds } },
    });

    return new Map(grammar.map((item) => [item.id, item]));
  }

  async setDownloadStatus(
    userId: string,
    entityType: OfflineEntityType,
    entityId: string,
    downloaded: boolean,
    status: OfflineStatus = downloaded ? 'downloaded' : 'failed',
  ) {
    await this.ensureEntityExists(entityType, entityId);

    const now = this.now();
    if (!downloaded) {
      const removed = await this.prisma.user_downloads.deleteMany({
        where: {
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
        },
      });

      return this.serializeData({
        entity_type: entityType,
        entity_id: entityId,
        status: 'removed',
        removed_count: removed.count,
      });
    }

    const record = await this.prisma.user_downloads.upsert({
      where: {
        user_id_entity_type_entity_id: {
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
        },
      },
      create: {
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        status,
        created_at: now,
        updated_at: now,
      },
      update: {
        status,
        updated_at: now,
      },
    });

    return this.serializeData(record);
  }

  async getSummary(userId: string) {
    const records = await this.prisma.user_downloads.findMany({
      where: { user_id: userId },
      select: {
        entity_type: true,
        status: true,
      },
    });

    const emptyBucket = { total: 0, downloaded: 0, pending: 0, failed: 0 };
    const summary = {
      total: records.length,
      downloaded: 0,
      pending: 0,
      failed: 0,
      by_entity_type: {
        question: { ...emptyBucket },
        vocabulary: { ...emptyBucket },
        grammar: { ...emptyBucket },
      },
    };

    for (const record of records) {
      const typeBucket =
        summary.by_entity_type[record.entity_type as OfflineEntityType];
      const status = record.status as OfflineStatus;

      typeBucket.total += 1;
      summary[status] += 1;
      typeBucket[status] += 1;
    }

    return summary;
  }

  async getItems(userId: string, query: GetOfflineItemsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(userId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user_downloads.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
      }),
      this.prisma.user_downloads.count({ where }),
    ]);

    const groupedIds = items.reduce<Record<OfflineEntityType, string[]>>(
      (accumulator, item) => {
        const entityType = item.entity_type as OfflineEntityType;
        accumulator[entityType].push(item.entity_id);
        return accumulator;
      },
      {
        question: [],
        vocabulary: [],
        grammar: [],
      },
    );

    const [questionMap, vocabularyMap, grammarMap] = await Promise.all([
      this.loadContentByType('question', groupedIds.question),
      this.loadContentByType('vocabulary', groupedIds.vocabulary),
      this.loadContentByType('grammar', groupedIds.grammar),
    ]);

    const itemsWithContent = items.map((item) => {
      const entityType = item.entity_type as OfflineEntityType;
      const content =
        entityType === 'question'
          ? questionMap.get(item.entity_id)
          : entityType === 'vocabulary'
            ? vocabularyMap.get(item.entity_id)
            : grammarMap.get(item.entity_id);

      return {
        ...item,
        content: content ?? null,
      };
    });

    return this.serializeData({
      items: itemsWithContent,
      page,
      limit,
      total,
    });
  }

  async sync(userId: string, dto: SyncOfflineDto) {
    if (dto.items.length === 0) {
      return {
        synced: 0,
        message: 'No offline items were provided',
      };
    }

    const uniqueItems = new Map<
      string,
      { entityType: OfflineEntityType; entityId: string; status: OfflineStatus }
    >();
    for (const item of dto.items) {
      const key = `${item.entity_type}:${item.entity_id}`;
      uniqueItems.set(key, {
        entityType: item.entity_type,
        entityId: item.entity_id,
        status: item.status ?? 'downloaded',
      });
    }

    const grouped: Record<OfflineEntityType, string[]> = {
      question: [],
      vocabulary: [],
      grammar: [],
    };

    for (const item of uniqueItems.values()) {
      grouped[item.entityType].push(item.entityId);
    }

    const [questions, vocabulary, grammar] = await Promise.all([
      this.prisma.questions.findMany({
        where: { id: { in: grouped.question } },
        select: { id: true },
      }),
      this.prisma.vocabulary.findMany({
        where: { id: { in: grouped.vocabulary } },
        select: { id: true },
      }),
      this.prisma.grammar_items.findMany({
        where: { id: { in: grouped.grammar } },
        select: { id: true },
      }),
    ]);

    const existingIds = {
      question: new Set(questions.map((item) => item.id)),
      vocabulary: new Set(vocabulary.map((item) => item.id)),
      grammar: new Set(grammar.map((item) => item.id)),
    };

    for (const item of uniqueItems.values()) {
      if (!existingIds[item.entityType].has(item.entityId)) {
        throw new NotFoundException(
          `${item.entityType} with ID ${item.entityId} not found`,
        );
      }
    }

    const now = this.now();

    await this.prisma.$transaction(async (tx) => {
      if (dto.replace) {
        await tx.user_downloads.deleteMany({
          where: {
            user_id: userId,
          },
        });
      }

      for (const item of uniqueItems.values()) {
        await tx.user_downloads.upsert({
          where: {
            user_id_entity_type_entity_id: {
              user_id: userId,
              entity_type: item.entityType,
              entity_id: item.entityId,
            },
          },
          create: {
            user_id: userId,
            entity_type: item.entityType,
            entity_id: item.entityId,
            status: item.status,
            created_at: now,
            updated_at: now,
          },
          update: {
            status: item.status,
            updated_at: now,
          },
        });
      }
    });

    return this.serializeData({
      synced: uniqueItems.size,
      replace: dto.replace ?? false,
    });
  }

  async getSyncStatus(userId: string) {
    const summary = await this.getSummary(userId);
    const lastRecord = await this.prisma.user_downloads.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      select: {
        updated_at: true,
      },
    });

    const status =
      summary.total === 0
        ? 'empty'
        : summary.pending > 0 || summary.failed > 0
          ? 'needs_attention'
          : 'synced';

    return this.serializeData({
      status,
      last_synced_at: lastRecord?.updated_at ?? null,
      total_items: summary.total,
      downloaded: summary.downloaded,
      pending: summary.pending,
      failed: summary.failed,
      by_entity_type: summary.by_entity_type,
    });
  }
}
