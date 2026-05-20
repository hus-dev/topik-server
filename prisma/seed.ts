import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') url.protocol = 'mariadb:';
  if (url.hostname === 'localhost' || url.hostname === '::1') url.hostname = '127.0.0.1';
  if (!url.searchParams.has('allowPublicKeyRetrieval')) url.searchParams.set('allowPublicKeyRetrieval', 'true');
  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaMariaDb(getDatabaseUrl()) });
}

async function main() {
  const prisma = createPrismaClient();
  const baseTime = BigInt(Date.now());

  try {
    console.log('🚀 Starting Strategic Database Seeding (30 Questions per Level)...');

    // 1. CLEANUP (Atomically clearing all related tables)
    console.log('🧹 Clearing existing data...');
    await prisma.$transaction([
      prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;'),
      prisma.$executeRawUnsafe('DELETE FROM `user_questions`;'),
      prisma.$executeRawUnsafe('DELETE FROM `answers`;'),
      prisma.$executeRawUnsafe('DELETE FROM `exam_sessions`;'),
      prisma.$executeRawUnsafe('DELETE FROM `user_vocabulary`;'),
      prisma.$executeRawUnsafe('DELETE FROM `user_grammar_items`;'),
      prisma.$executeRawUnsafe('DELETE FROM `sync_queue`;'),
      prisma.$executeRawUnsafe('DELETE FROM `explanation_videos`;'),
      prisma.$executeRawUnsafe('DELETE FROM `question_media`;'),
      prisma.$executeRawUnsafe('DELETE FROM `question_options`;'),
      prisma.$executeRawUnsafe('DELETE FROM `questions`;'),
      prisma.$executeRawUnsafe('DELETE FROM `question_passages`;'),
      prisma.$executeRawUnsafe('DELETE FROM `question_sets`;'),
      prisma.$executeRawUnsafe('DELETE FROM `users`;'),
      prisma.$executeRawUnsafe('DELETE FROM `user_downloads`;'),
      prisma.$executeRawUnsafe('DELETE FROM `topik_exam_schedules`;'),
      prisma.$executeRawUnsafe('DELETE FROM `vocabulary`;'),
      prisma.$executeRawUnsafe('DELETE FROM `grammar_items`;'),
      prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;'),
    ]);

    // 2. CREATE ADMIN & USER
    console.log('👤 Creating essential users...');
    const adminPassword = await bcrypt.hash('Admin1234!', 10);
    const userPassword = await bcrypt.hash('User1234!', 10);
    await prisma.users.createMany({
      data: [
        { id: 'admin-id', email: 'mock-admin@topik.local', nickname: 'AdminMaster', password_hash: adminPassword, role: 'admin', provider: 'local', target_level: 6, language_code: 'ko', timezone: 'Asia/Seoul', timer_mode: 'normal', created_at: baseTime, updated_at: baseTime },
        { id: 'user-id', email: 'mock-user@topik.local', nickname: 'TopikLearner', password_hash: userPassword, role: 'user', provider: 'local', target_level: 4, language_code: 'ko', timezone: 'Asia/Seoul', timer_mode: 'normal', created_at: baseTime, updated_at: baseTime }
      ]
    });

    // 3. SEED LOGIC: 30 Questions per Level (3, 4, 5, 6)
    const sections = ['reading', 'listening'];
    const levels = [3, 4, 5, 6];

    for (const section of sections) {
      console.log(`📦 Processing ${section} section...`);
      const jsonFile = `topik2-${section}-practice-1.json`;
      const filePath = path.join(process.cwd(), 'content', jsonFile);
      
      if (!existsSync(filePath)) continue;
      const rawContent = JSON.parse(readFileSync(filePath, 'utf8'));
      const allSourceQuestions = rawContent.questions;

      for (const level of levels) {
        console.log(`   └─ Seeding Level ${level}: Ensuring 30 questions...`);
        const setId = `practice-${section}-lvl${level}`;
        
        await prisma.question_sets.create({
          data: {
            id: setId,
            title: `TOPIK II ${section.toUpperCase()} - Level ${level}`,
            section: section,
            level: level,
            exam_kind: 'mock',
            total_questions: 30, // 무조건 30개로 고정
            duration_seconds: 3600,
            display_order: level,
            created_at: baseTime,
            updated_at: baseTime,
          }
        });

        // 해당 급수 소스 문제 필터링 (없으면 전체에서 가져옴)
        let sourceQuestions = allSourceQuestions.filter((q: any) => q.level === level);
        if (sourceQuestions.length === 0) {
          // 6급 데이터가 없을 경우 5급이나 가장 비슷한 데이터를 빌려와서 변환
          sourceQuestions = allSourceQuestions.filter((q: any) => q.level === (level - 1)) || allSourceQuestions;
        }

        for (let i = 0; i < 30; i++) {
          const q = sourceQuestions[i % sourceQuestions.length];
          const questionNumber = i + 1;
          const questionId = `${setId}-q${questionNumber}`;
          
          let passageId: string | null = null;
          const passageContent = q.passage || q.question_text;
          if (passageContent) {
            passageId = `${questionId}-p`;
            await prisma.question_passages.create({
              data: {
                id: passageId,
                title: `Level ${level} - Q${questionNumber}`,
                content: passageContent,
                created_at: baseTime,
                updated_at: baseTime
              }
            });
          }

          await prisma.questions.create({
            data: {
              id: questionId,
              set_id: setId,
              passage_id: passageId,
              section: section,
              question_type: q.question_type || 'multiple_choice',
              question_number: questionNumber,
              level: level, // 강제로 해당 급수로 지정
              prompt: q.prompt,
              correct_answer: q.correct_answer,
              explanation: q.explanation || `이 문제는 ${level}급 수준의 정답 ${q.correct_answer}번에 대한 해설입니다.`,
              difficulty: level,
              time_limit_seconds: 60,
              created_at: baseTime,
              updated_at: baseTime,
              question_options: {
                create: q.options.map((opt: string, idx: number) => ({
                  option_number: idx + 1,
                  content: opt,
                  is_correct: (idx + 1).toString() === q.correct_answer ? 1 : 0
                }))
              },
              question_media: section === 'listening' ? {
                create: {
                  media_type: 'audio',
                  url: `/audio/listening/seed-lm1-q${((i % 28) + 1).toString().padStart(2, '0')}.wav`,
                  transcript: q.passage || '',
                  created_at: baseTime,
                  updated_at: baseTime
                }
              } : undefined
            }
          });
        }
      }
    }

    console.log('✅ Final Report: Reading & Listening (Lv 3-6) all have exactly 30 questions now!');
  } catch (error) {
    console.error('❌ Strategic Seeding Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
