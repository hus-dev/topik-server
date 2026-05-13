import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OfflineService } from '../offline/offline.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { GetGrammarQueryDto } from './dto/get-grammar-query.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';

@Injectable()
export class GrammarService {
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
    const grammar = await this.prisma.grammar_items.findUnique({
      where: { id },
    });

    if (!grammar) {
      throw new NotFoundException(`Grammar item with ID ${id} not found`);
    }

    return grammar;
  }

  async findAll(query: GetGrammarQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.grammar_itemsWhereInput = {
      ...(query.q
        ? {
            OR: [
              { pattern: { contains: query.q } },
              { description: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.grammar_items.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.grammar_items.count({ where }),
    ]);

    return this.serializeData({
      items,
      page,
      limit,
      total,
    });
  }

  async findOne(id: string) {
    const grammar = await this.ensureExists(id);
    return this.serializeData(grammar);
  }

  async setBookmark(userId: string, grammarId: string, bookmarked: boolean) {
    await this.ensureExists(grammarId);

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

  async setDownloaded(userId: string, id: string, downloaded: boolean) {
    return this.offlineService.setDownloadStatus(
      userId,
      'grammar',
      id,
      downloaded,
    );
  }

  async create(createGrammarDto: CreateGrammarDto) {
    const grammar = await this.prisma.grammar_items.create({
      data: {
        ...createGrammarDto,
        tags_json: createGrammarDto.tags_json ?? [],
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(grammar);
  }

  async update(id: string, updateGrammarDto: UpdateGrammarDto) {
    await this.ensureExists(id);

    const grammar = await this.prisma.grammar_items.update({
      where: { id },
      data: {
        ...updateGrammarDto,
        updated_at: BigInt(Date.now()),
      },
    });

    return this.serializeData(grammar);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const grammar = await this.prisma.grammar_items.delete({
      where: { id },
    });

    return this.serializeData(grammar);
  }
}
