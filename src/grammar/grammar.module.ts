import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';

@Module({
  imports: [PrismaModule],
  controllers: [GrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
