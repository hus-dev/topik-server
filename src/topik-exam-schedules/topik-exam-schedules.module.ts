import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TopikExamSchedulesController } from './topik-exam-schedules.controller';
import { TopikExamSchedulesService } from './topik-exam-schedules.service';

@Module({
  imports: [PrismaModule],
  controllers: [TopikExamSchedulesController],
  providers: [TopikExamSchedulesService],
  exports: [TopikExamSchedulesService],
})
export class TopikExamSchedulesModule {}
