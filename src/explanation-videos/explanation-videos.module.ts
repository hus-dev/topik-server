import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExplanationVideosController } from './explanation-videos.controller';
import { ExplanationVideosService } from './explanation-videos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExplanationVideosController],
  providers: [ExplanationVideosService],
  exports: [ExplanationVideosService],
})
export class ExplanationVideosModule {}
