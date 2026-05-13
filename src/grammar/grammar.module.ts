import { Module } from '@nestjs/common';
import { OfflineModule } from '../offline/offline.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';

@Module({
  imports: [PrismaModule, OfflineModule],
  controllers: [GrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
