import 'dotenv/config';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getConnectionString()),
});

const now = () => BigInt(Date.now());
const questionSetTitle = 'DEV TOPIK II Reading Photo Set';
const readingsDir = join(process.cwd(), 'test/photos/readings');

function toMediaUrl(fileName: string) {
  return `/test/photos/readings/${encodeURIComponent(fileName)}`;
}

async function clearExistingSet() {
  const set = await prisma.question_sets.findFirst({
    where: { title: questionSetTitle },
    select: { id: true },
  });

  if (!set) return;

  const questions = await prisma.questions.findMany({
    where: { set_id: set.id },
    select: { id: true },
  });
  const questionIds = questions.map((question) => question.id);

  if (questionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_options.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_media.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.questions.deleteMany({
      where: { id: { in: questionIds } },
    });
  }

  await prisma.exam_sessions.deleteMany({
    where: { set_id: set.id },
  });
  await prisma.question_sets.delete({
    where: { id: set.id },
  });
}

async function main() {
  if (!existsSync(readingsDir)) {
    throw new Error(`Reading photos directory not found: ${readingsDir}`);
  }

  const files = readdirSync(readingsDir)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No reading photos found in: ${readingsDir}`);
  }

  await clearExistingSet();

  const timestamp = now();
  const set = await prisma.question_sets.create({
    data: {
      title: questionSetTitle,
      section: 'reading',
      level: 3,
      created_at: timestamp,
      updated_at: timestamp,
    },
  });

  for (const [index, fileName] of files.entries()) {
    const questionTimestamp = now();

    await prisma.questions.create({
      data: {
        set_id: set.id,
        section: 'reading',
        question_type: 'multiple_choice',
        question_number: index + 1,
        level: 3,
        prompt:
          '첨부된 읽기 문제 이미지를 보고 알맞은 답을 고르십시오. 개발용 이미지 기반 문제입니다.',
        correct_answer: '1',
        explanation:
          '이미지 기반 개발 데이터입니다. 실제 정답 검수 전까지 1번을 기본 정답으로 사용합니다.',
        difficulty: 2,
        time_limit_seconds: 90,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: questionTimestamp,
        updated_at: questionTimestamp,
        question_options: {
          create: [
            { option_number: 1, content: '1', is_correct: 1 },
            { option_number: 2, content: '2', is_correct: 0 },
            { option_number: 3, content: '3', is_correct: 0 },
            { option_number: 4, content: '4', is_correct: 0 },
          ],
        },
        question_media: {
          create: {
            media_type: 'image',
            url: toMediaUrl(fileName),
            sort_order: 1,
            created_at: questionTimestamp,
            updated_at: questionTimestamp,
          },
        },
      },
    });
  }

  console.log(
    `Reading photo seed completed: ${files.length} questions created in set ${set.id}`,
  );
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
