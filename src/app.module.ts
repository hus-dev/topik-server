import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { QuestionSetsModule } from './question-sets/question-sets.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, QuestionSetsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
