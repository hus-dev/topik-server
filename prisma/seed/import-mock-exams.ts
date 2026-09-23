import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { buildMediaUrl } from './media-url';
import Redis from 'ioredis';

type ExamQuestionJson = {
  question_number: number;
  section: 'listening' | 'reading' | 'writing';
  question_type?: string;
  prompt: string;
  question_text?: string | null;
  passage?: string | null;
  options: string[];
  correct_answer: string;
  explanation: string;
  audio_url?: string | null;
  image_url?: string | null;
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.hostname === 'localhost' || url.hostname === '::1') {
    url.hostname = '127.0.0.1';
  }
  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
});

const now = () => BigInt(Date.now());

async function cleanMockSet(setId: string) {
  console.log(`Cleaning old data for set ${setId}...`);
  const existingQuestions = await prisma.questions.findMany({
    where: { set_id: setId },
    select: { id: true, passage_id: true },
  });

  const questionIds = existingQuestions.map((q) => q.id);
  const passageIds = existingQuestions
    .map((q) => q.passage_id)
    .filter((id): id is string => Boolean(id));

  // Find any sessions for this set
  const existingSessions = await prisma.exam_sessions.findMany({
    where: { set_id: setId },
    select: { id: true },
  });
  const sessionIds = existingSessions.map((s) => s.id);
  if (sessionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { session_id: { in: sessionIds } },
    });
    await prisma.exam_sessions.deleteMany({
      where: { id: { in: sessionIds } },
    });
  }

  if (questionIds.length > 0) {
    await prisma.user_questions.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.answers.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_options.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_media.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.explanation_videos.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.questions.deleteMany({
      where: { id: { in: questionIds } },
    });
  }

  if (passageIds.length > 0) {
    await prisma.question_passages.deleteMany({
      where: { id: { in: passageIds } },
    });
  }

  await prisma.explanation_videos.deleteMany({
    where: { set_id: setId },
  });

  await prisma.question_sets.deleteMany({
    where: { id: setId },
  });
}

async function importExamSet(config: {
  setId: string;
  round: number;
  section: 'listening' | 'reading' | 'writing';
  title: string;
  durationSeconds: number;
  jsonPath: string;
}) {
  await cleanMockSet(config.setId);

  const currentTime = now();
  console.log(`Importing ${config.title} (${config.setId})...`);

  const rawJson = readFileSync(join(process.cwd(), config.jsonPath), 'utf8');
  const questions: ExamQuestionJson[] = JSON.parse(rawJson);

  await prisma.question_sets.create({
    data: {
      id: config.setId,
      title: config.title,
      section: config.section,
      level: 4,
      exam_kind: 'mock',
      total_questions: questions.length,
      duration_seconds: config.durationSeconds,
      price: 0,
      is_free: 1,
      display_order: config.round,
      created_at: currentTime,
      updated_at: currentTime,
    },
  });

  for (const q of questions) {
    const questionId = `${config.setId}-q${q.question_number.toString().padStart(2, '0')}`;
    let passageId: string | null = null;

    if (q.passage && q.passage.trim().length > 0) {
      passageId = `${questionId}-passage`;
      await prisma.question_passages.create({
        data: {
          id: passageId,
          title: `제${config.round}회 TOPIK II ${config.section === 'listening' ? '듣기' : (config.section === 'writing' ? '쓰기' : '읽기')} ${q.question_number}번`,
          content: q.passage.trim(),
          created_at: currentTime,
          updated_at: currentTime,
        },
      });
    }

    const qType = q.question_type ?? (config.section === 'writing' ? (q.question_number <= 52 ? 'writing_short_completion' : (q.question_number === 53 ? 'writing_graph_description' : 'writing_essay')) : 'multiple_choice');

    const questionRecord = await prisma.questions.create({
      data: {
        id: questionId,
        set_id: config.setId,
        passage_id: passageId,
        section: config.section,
        question_type: qType,
        question_number: q.question_number,
        level: 4,
        prompt: q.prompt,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: 3,
        time_limit_seconds: config.section === 'listening' ? 72 : (config.section === 'writing' ? 750 : 84),
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: currentTime,
        updated_at: currentTime,
        question_options: {
          create: (q.options || []).map((optText, optIdx) => ({
            option_number: optIdx + 1,
            content: optText,
            is_correct: (optIdx + 1).toString() === q.correct_answer ? 1 : 0,
          })),
        },
      },
    });

    let sortOrder = 1;
    // Audio media
    if (q.audio_url) {
      await prisma.question_media.create({
        data: {
          question_id: questionRecord.id,
          media_type: 'audio',
          url: buildMediaUrl(q.audio_url),
          transcript: q.explanation,
          sort_order: sortOrder++,
          created_at: currentTime,
          updated_at: currentTime,
        },
      });
    }

    // Image media (Q1~Q3 listening, Q53 writing, Q9~Q10 reading)
    if (q.image_url) {
      await prisma.question_media.create({
        data: {
          question_id: questionRecord.id,
          media_type: 'image',
          url: buildMediaUrl(q.image_url),
          transcript: `제${config.round}회 ${q.question_number}번 그림 자료`,
          sort_order: sortOrder++,
          created_at: currentTime,
          updated_at: currentTime,
        },
      });
    }
  }

  console.log(`✅ Completed ${config.title}: ${questions.length} questions inserted.`);
}

async function main() {
  console.log('🚀 Starting import of TOPIK II real mock exams (102회 & 83회)...');

  // 1. 102회 Listening (50문항)
  await importExamSet({
    setId: 'topik2-102-listening',
    round: 102,
    section: 'listening',
    title: '제102회 TOPIK II 듣기 모의고사',
    durationSeconds: 3600,
    jsonPath: 'content/topik2-102/listening-exam.json',
  });

  // 2. 102회 Writing (4문항: 51~54)
  await importExamSet({
    setId: 'topik2-102-writing',
    round: 102,
    section: 'writing',
    title: '제102회 TOPIK II 쓰기 모의고사',
    durationSeconds: 3000,
    jsonPath: 'content/topik2-102/writing-exam.json',
  });

  // 3. 102회 Reading (50문항)
  await importExamSet({
    setId: 'topik2-102-reading',
    round: 102,
    section: 'reading',
    title: '제102회 TOPIK II 읽기 모의고사',
    durationSeconds: 4200,
    jsonPath: 'content/topik2-102/reading-exam.json',
  });

  // 4. 83회 Listening (50문항)
  await importExamSet({
    setId: 'topik2-83-listening',
    round: 83,
    section: 'listening',
    title: '제83회 TOPIK II 듣기 모의고사',
    durationSeconds: 3600,
    jsonPath: 'content/topik2-83/listening-exam.json',
  });

  // 5. 83회 Writing (4문항: 51~54)
  await importExamSet({
    setId: 'topik2-83-writing',
    round: 83,
    section: 'writing',
    title: '제83회 TOPIK II 쓰기 모의고사',
    durationSeconds: 3000,
    jsonPath: 'content/topik2-83/writing-exam.json',
  });

  // 6. 83회 Reading (50문항)
  await importExamSet({
    setId: 'topik2-83-reading',
    round: 83,
    section: 'reading',
    title: '제83회 TOPIK II 읽기 모의고사',
    durationSeconds: 4200,
    jsonPath: 'content/topik2-83/reading-exam.json',
  });

  // Flush redis cache
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    });
    await redis.flushdb();
    redis.disconnect();
    console.log('✅ Flushed Redis cache.');
  } catch (e) {
    console.log('Redis flush skipped:', (e as Error).message);
  }

  console.log('🎉 All mock exams imported successfully!');
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
