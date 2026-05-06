import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticeSessionsController } from './practice-sessions.controller';
import { PracticeSessionsService } from './practice-sessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PracticeSessionsController],
  providers: [PracticeSessionsService],
  exports: [PracticeSessionsService],
})
export class PracticeSessionsModule {}
