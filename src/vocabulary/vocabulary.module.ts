import { Module } from '@nestjs/common';
import { OfflineModule } from '../offline/offline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiExampleService } from './ai-example.service';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

@Module({
  imports: [PrismaModule, OfflineModule, RedisModule],
  controllers: [VocabularyController],
  providers: [VocabularyService, AiExampleService],
  exports: [VocabularyService, AiExampleService],
})
export class VocabularyModule {}
