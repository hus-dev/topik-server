import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [MockExamsController],
  providers: [MockExamsService],
  exports: [MockExamsService],
})
export class MockExamsModule {}
