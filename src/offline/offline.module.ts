import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';

@Module({
  imports: [PrismaModule],
  controllers: [OfflineController],
  providers: [OfflineService],
  exports: [OfflineService],
})
export class OfflineModule {}
