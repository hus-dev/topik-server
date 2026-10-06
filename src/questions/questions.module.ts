import { Module } from '@nestjs/common';
import { OfflineModule } from '../offline/offline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionsAiExplanationService } from './questions-ai-explanation.service';

@Module({
  imports: [PrismaModule, OfflineModule, RedisModule, UsersModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionsAiExplanationService],
  exports: [QuestionsService, QuestionsAiExplanationService],
})
export class QuestionsModule {}

