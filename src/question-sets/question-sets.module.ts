import { Module } from '@nestjs/common';
import { QuestionSetsService } from './question-sets.service';
import { QuestionSetsController } from './question-sets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService],
  exports: [QuestionSetsService],
})
export class QuestionSetsModule {}
