import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { QuestionSetsModule } from './question-sets/question-sets.module';
import { QuestionsModule } from './questions/questions.module';
import { PracticeSessionsModule } from './practice-sessions/practice-sessions.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { GrammarModule } from './grammar/grammar.module';
import { MockExamsModule } from './mock-exams/mock-exams.module';
import { OfflineModule } from './offline/offline.module';
import { TopikExamSchedulesModule } from './topik-exam-schedules/topik-exam-schedules.module';
import { ExplanationVideosModule } from './explanation-videos/explanation-videos.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    QuestionSetsModule,
    QuestionsModule,
    PracticeSessionsModule,
    MockExamsModule,
    BookmarksModule,
    VocabularyModule,
    GrammarModule,
    OfflineModule,
    TopikExamSchedulesModule,
    ExplanationVideosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
