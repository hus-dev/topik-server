import 'dotenv/config';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { buildMediaUrl } from './media-url';
import Redis from 'ioredis';

/**
 * 임의의 TOPIK II 회차 듣기 기출(공식 MP3)을 "급수별 연습 세트"에 임포트합니다.
 * 사용법: npm run import:topik-exam -- 83
 *
 * 사전 준비(파일 규칙):
 *   topik_data/topik2-83/제83회 토픽2 듣기파일/*.mp3   (공식 듣기 오디오)
 *   topik_data/topik2-83/83회_문제지...pdf             (문제지 PDF, 선택)
 *   content/topik2-83/answers.json                     (정답 키)
 *
 * answers.json 형식: { "listening": ["2","1","3", ... 50개] }
 *
 * 급수 매핑(TOPIK II는 3~6급 통합 시험이므로 문항 번호로 난이도 추정):
 *   1~20 -> 3급, 21~35 -> 4급, 36~45 -> 5급, 46~50 -> 6급
 */

const round = Number(process.argv[2]);
if (!Number.isInteger(round) || round < 1) {
  console.error('사용법: npm run import:topik-exam -- <회차번호>');
  process.exit(1);
}

const roundDir = join(process.cwd(), 'topik_data', `topik2-${round}`);
const publicAudioDir = join(process.cwd(), `test/audio/topik2-${round}`);
const publicAudioPrefix = `/test/audio/topik2-${round}`;
const answersPath = join(process.cwd(), `content/topik2-${round}/answers.json`);

const LEVEL_SETS: Record<number, string> = {
  3: 'listening-real-lvl3',
  4: 'listening-real-lvl4',
  5: 'listening-real-lvl5',
  6: 'listening-real-lvl6',
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
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

function levelForQuestion(questionNumber: number): number {
  if (questionNumber <= 20) return 3;
  if (questionNumber <= 35) return 4;
  if (questionNumber <= 45) return 5;
  return 6;
}

function loadAnswers(): string[] {
  if (!existsSync(answersPath)) {
    throw new Error(`정답 키가 없습니다: ${answersPath}`);
  }
  const raw = JSON.parse(readFileSync(answersPath, 'utf8')) as {
    listening?: string[];
  };
  const answers = raw.listening ?? [];
  if (!Array.isArray(answers) || answers.length < 50) {
    throw new Error(`${answersPath} 에 listening 정답 50개가 필요합니다.`);
  }
  return answers.slice(0, 50).map(String);
}

function findSourceAudioDir(): string {
  if (!existsSync(roundDir)) {
    throw new Error(`폴더가 없습니다: ${roundDir}`);
  }
  const dir = readdirSync(roundDir).find((name) => {
    const normalized = name.normalize('NFC');
    return (
      normalized.includes('듣기') &&
      statSync(join(roundDir, name)).isDirectory()
    );
  });
  if (!dir) {
    throw new Error(`${roundDir} 에서 듣기파일 폴더를 찾지 못했습니다.`);
  }
  return join(roundDir, dir);
}

function findPdfUrl(): string | null {
  if (!existsSync(roundDir)) return null;
  const pdf = readdirSync(roundDir).find((name) => {
    const normalized = name.normalize('NFC');
    return normalized.includes('듣기') && name.toLowerCase().endsWith('.pdf');
  });
  if (!pdf) return null;
  return `/topik-data/topik2-${round}/${encodeURIComponent(pdf)}`;
}

function copyAudio() {
  const sourceDir = findSourceAudioDir();
  const files = readdirSync(sourceDir)
    .filter((name) => name.toLowerCase().endsWith('.mp3'))
    .sort();
  if (files.length < 50) {
    throw new Error(`${sourceDir} 에 MP3가 ${files.length}개뿐입니다. (50개 필요)`);
  }

  // 51개면 첫 트랙(안내 방송)을 건너뛰고 나머지 50개를 문항 1~50에 매핑
  const questionFiles =
    files.length >= 51 ? files.slice(1, 51) : files.slice(0, 50);

  mkdirSync(publicAudioDir, { recursive: true });
  for (let q = 1; q <= 50; q += 1) {
    const src = join(sourceDir, questionFiles[q - 1]);
    const dst = join(
      publicAudioDir,
      `listening-q${q.toString().padStart(2, '0')}.mp3`,
    );
    copyFileSync(src, dst);
  }

  console.log(`   오디오 ${questionFiles.length}개 매핑 완료`);
  console.log(`   예: ${questionFiles[0]} -> listening-q01.mp3 (1번 문항)`);
}

async function deleteRoundQuestions(setId: string) {
  const questions = await prisma.questions.findMany({
    where: { set_id: setId, id: { startsWith: `${setId}-${round}-` } },
    select: { id: true },
  });
  const ids = questions.map((q) => q.id);
  if (ids.length === 0) return;
  await prisma.answers.deleteMany({ where: { question_id: { in: ids } } });
  await prisma.question_options.deleteMany({ where: { question_id: { in: ids } } });
  await prisma.question_media.deleteMany({ where: { question_id: { in: ids } } });
  await prisma.questions.deleteMany({ where: { id: { in: ids } } });
}

async function cleanupLegacySet() {
  const legacyId = `topik2-${round}-listening`;
  const questions = await prisma.questions.findMany({
    where: { set_id: legacyId },
    select: { id: true },
  });
  const ids = questions.map((q) => q.id);
  if (ids.length > 0) {
    await prisma.answers.deleteMany({ where: { question_id: { in: ids } } });
    await prisma.question_options.deleteMany({ where: { question_id: { in: ids } } });
    await prisma.question_media.deleteMany({ where: { question_id: { in: ids } } });
    await prisma.questions.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.exam_sessions.deleteMany({ where: { set_id: legacyId } });
  await prisma.question_sets.deleteMany({ where: { id: legacyId } });
}

async function clearCaches() {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT ?? 6379);
  const password = process.env.REDIS_PASSWORD;
  const redis = new Redis({
    host,
    port,
    password: password || undefined,
    maxRetriesPerRequest: null,
  });

  try {
    await redis.del('question-sets:list');
    const keys: string[] = [];
    const stream = redis.scanStream({ match: 'questions:list:*', count: 100 });
    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }
    if (keys.length > 0) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
}

async function main() {
  const answers = loadAnswers();
  const pdfUrl = findPdfUrl();
  copyAudio();
  await cleanupLegacySet();

  const ts = now();
  const totals: Record<number, number> = {};

  for (let level = 3; level <= 6; level += 1) {
    const setId = LEVEL_SETS[level];

    await prisma.question_sets.upsert({
      where: { id: setId },
      create: {
        id: setId,
        title: `TOPIK II 듣기 실전 ${level}급`,
        section: 'listening',
        level,
        exam_kind: 'practice',
        total_questions: 0,
        duration_seconds: 3600,
        price: 0,
        is_free: 1,
        display_order: level,
        created_at: ts,
        updated_at: ts,
      },
      update: { updated_at: ts },
    });

    await deleteRoundQuestions(setId);

    let created = 0;
    for (let q = 1; q <= 50; q += 1) {
      if (levelForQuestion(q) !== level) continue;

      const questionId = `${setId}-${round}-q${q.toString().padStart(2, '0')}`;
      const answer = answers[q - 1];

      const media: Prisma.question_mediaCreateWithoutQuestionsInput[] = [
        {
          media_type: 'audio',
          url: buildMediaUrl(
            `${publicAudioPrefix}/listening-q${q.toString().padStart(2, '0')}.mp3`,
          ),
          transcript: `제${round}회 TOPIK II 듣기 ${q}번 공식 MP3`,
          sort_order: 1,
          created_at: ts,
          updated_at: ts,
        },
      ];
      if (pdfUrl) {
        media.push({
          media_type: 'document',
          url: buildMediaUrl(pdfUrl),
          transcript: `제${round}회 TOPIK II 듣기 문제지 PDF 원문`,
          sort_order: 2,
          created_at: ts,
          updated_at: ts,
        });
      }

      await prisma.questions.create({
        data: {
          id: questionId,
          set_id: setId,
          section: 'listening',
          question_type: 'multiple_choice',
          question_number: q,
          level,
          prompt: '다음을 듣고 물음에 답하십시오.',
          correct_answer: answer,
          explanation: `정답은 ${answer}번입니다.`,
          difficulty: level,
          time_limit_seconds: 72,
          is_ai_generated: 0,
          is_downloaded: 0,
          created_at: ts,
          updated_at: ts,
          question_options: {
            create: [1, 2, 3, 4].map((n) => ({
              option_number: n,
              content: String(n),
              is_correct: String(n) === answer ? 1 : 0,
            })),
          },
          question_media: { create: media },
        },
      });
      created += 1;
    }

    const total = await prisma.questions.count({ where: { set_id: setId } });
    await prisma.question_sets.update({
      where: { id: setId },
      data: { total_questions: total },
    });
    totals[level] = created;
  }

  await clearCaches();

  console.log(`✅ 제${round}회 TOPIK II 듣기 기출을 급수별 연습 세트에 반영 완료`);
  console.log(`   3급 +${totals[3]} / 4급 +${totals[4]} / 5급 +${totals[5]} / 6급 +${totals[6]}`);
  if (pdfUrl) {
    console.log(`   문제지 PDF: ${buildMediaUrl(pdfUrl)}`);
  } else {
    console.log('   ⚠ 문제지 PDF를 찾지 못했습니다. (선택 사항)');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

