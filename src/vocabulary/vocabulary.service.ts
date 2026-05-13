import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OfflineService } from '../offline/offline.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { GetVocabularyQueryDto } from './dto/get-vocabulary-query.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';

@Injectable()
export class VocabularyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offlineService: OfflineService,
  ) {}

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

  private async ensureExists(id: string) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id },
    });

    if (!vocabulary) {
      throw new NotFoundException(`Vocabulary with ID ${id} not found`);
    }

    return vocabulary;
  }

  async findAll(query: GetVocabularyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.vocabularyWhereInput = {
      ...(query.level !== undefined ? { level: query.level } : {}),
      ...(query.q
        ? {
            OR: [
              { word: { contains: query.q } },
              { meaning_ko: { contains: query.q } },
              { meaning_user_lang: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ level: 'asc' }, { word: 'asc' }],
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    return this.serializeData({
      items,
      page,
      limit,
      total,
    });
  }

  async findOne(id: string) {
    const vocabulary = await this.ensureExists(id);
    return this.serializeData(vocabulary);
  }

  async setBookmark(userId: string, vocabularyId: string, bookmarked: boolean) {
    await this.ensureExists(vocabularyId);

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

  async setDownloaded(userId: string, id: string, downloaded: boolean) {
    return this.offlineService.setDownloadStatus(
      userId,
      'vocabulary',
      id,
      downloaded,
    );
  }

  async create(createVocabularyDto: CreateVocabularyDto) {
    const vocabulary = await this.prisma.vocabulary.create({
      data: {
        ...createVocabularyDto,
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(vocabulary);
  }

  async update(id: string, updateVocabularyDto: UpdateVocabularyDto) {
    await this.ensureExists(id);

    const vocabulary = await this.prisma.vocabulary.update({
      where: { id },
      data: {
        ...updateVocabularyDto,
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(vocabulary);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const vocabulary = await this.prisma.vocabulary.delete({
      where: { id },
    });

    return this.serializeData(vocabulary);
  }
}
