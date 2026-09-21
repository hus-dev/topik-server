// prisma/seed/migrate-media-urls-to-cdn.ts
// DB에 저장된 미디어 URL(상대 경로)을 CloudFront CDN 절대 URL로 일괄 치환한다.
//
// 사용법:
//   npm run media:migrate-urls             # dry-run: 변경 대상 리포트만 출력
//   npm run media:migrate-urls -- --apply  # 실제 DB 업데이트 + Redis 캐시 무효화
//
// 대상 컬럼: question_media.url, explanation_videos.video_url/thumbnail_url,
//           vocabulary.tts_url
// 규칙:
//   - '/'로 시작하는 상대 경로만 변환한다. 이미 http(s)인 URL은 건드리지 않는다(멱등).
//   - 레거시 '/audio/...' 별칭은 '/test/audio/...'로 정규화한다.
//   - 최종 URL이 500자(VarChar 500)를 초과하면 변경 대상에서 제외하고 경고한다.
//   - 실행 전 DB 덤프(또는 RDS Snapshot)를 권장한다.

import 'dotenv/config';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const LEGACY_AUDIO_PREFIX = '/audio/';
const CANONICAL_AUDIO_PREFIX = '/test/audio/';
const URL_MAX_LENGTH = 500;
const UPDATE_CHUNK_SIZE = 50;
const SAMPLE_COUNT = 5;

const APPLY = process.argv.includes('--apply');
const CDN_BASE = (process.env.MEDIA_CDN_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

type PendingUpdate = {
  table: 'question_media' | 'explanation_videos' | 'vocabulary';
  column: 'url' | 'video_url' | 'thumbnail_url' | 'tts_url';
  id: string;
  from: string;
  to: string;
};

function getDatabaseUrl(): string {
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

function normalizeRelativePath(url: string): string {
  if (url.startsWith(LEGACY_AUDIO_PREFIX)) {
    return CANONICAL_AUDIO_PREFIX + url.slice(LEGACY_AUDIO_PREFIX.length);
  }
  return url;
}

function toCdnUrl(relativeUrl: string): string {
  return `${CDN_BASE}${normalizeRelativePath(relativeUrl)}`;
}

function prefixOf(url: string): string {
  return url.split('/').slice(0, 3).join('/') || '/';
}

async function collectPendingUpdates(): Promise<PendingUpdate[]> {
  const updates: PendingUpdate[] = [];

  const mediaRows = await prisma.question_media.findMany({
    where: { url: { startsWith: '/' } },
    select: { id: true, url: true },
  });
  for (const row of mediaRows) {
    updates.push({
      table: 'question_media',
      column: 'url',
      id: row.id,
      from: row.url,
      to: toCdnUrl(row.url),
    });
  }

  const [videoRows, thumbnailRows] = await Promise.all([
    prisma.explanation_videos.findMany({
      where: { video_url: { startsWith: '/' } },
      select: { id: true, video_url: true },
    }),
    prisma.explanation_videos.findMany({
      where: { thumbnail_url: { startsWith: '/' } },
      select: { id: true, thumbnail_url: true },
    }),
  ]);
  for (const row of videoRows) {
    if (row.video_url === null) continue;
    updates.push({
      table: 'explanation_videos',
      column: 'video_url',
      id: row.id,
      from: row.video_url,
      to: toCdnUrl(row.video_url),
    });
  }
  for (const row of thumbnailRows) {
    if (row.thumbnail_url === null) continue;
    updates.push({
      table: 'explanation_videos',
      column: 'thumbnail_url',
      id: row.id,
      from: row.thumbnail_url,
      to: toCdnUrl(row.thumbnail_url),
    });
  }

  const vocabularyRows = await prisma.vocabulary.findMany({
    where: { tts_url: { startsWith: '/' } },
    select: { id: true, tts_url: true },
  });
  for (const row of vocabularyRows) {
    if (row.tts_url === null) continue;
    updates.push({
      table: 'vocabulary',
      column: 'tts_url',
      id: row.id,
      from: row.tts_url,
      to: toCdnUrl(row.tts_url),
    });
  }

  return updates;
}

function printReport(updates: PendingUpdate[], overflow: PendingUpdate[]) {
  const byPrefix = new Map<string, number>();
  for (const update of updates) {
    const prefix = prefixOf(update.from);
    byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
  }

  console.log(`\n📋 변환 대상: ${updates.length}건`);
  for (const [prefix, count] of Array.from(byPrefix.entries()).sort()) {
    console.log(`   ${prefix}/... : ${count}건`);
  }

  for (const sample of updates.slice(0, SAMPLE_COUNT)) {
    console.log(`   예시: ${sample.from}\n      → ${sample.to}`);
  }

  if (overflow.length > 0) {
    console.log(
      `\n⚠️  URL 길이 초과(${URL_MAX_LENGTH}자)로 제외된 ${overflow.length}건:`,
    );
    for (const item of overflow.slice(0, 10)) {
      console.log(`   ${item.from} (${toCdnUrl(item.from).length}자)`);
    }
  }
}

async function applyUpdates(updates: PendingUpdate[]): Promise<number> {
  let applied = 0;
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK_SIZE) {
    const chunk = updates.slice(i, i + UPDATE_CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (update) => {
        if (update.table === 'question_media') {
          await prisma.question_media.update({
            where: { id: update.id },
            data: { url: update.to },
          });
        } else if (update.table === 'explanation_videos') {
          await prisma.explanation_videos.update({
            where: { id: update.id },
            data: { [update.column]: update.to },
          });
        } else {
          await prisma.vocabulary.update({
            where: { id: update.id },
            data: { tts_url: update.to },
          });
        }
        applied += 1;
      }),
    );
  }
  return applied;
}

async function invalidateRedisCaches(): Promise<void> {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT ?? 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  const redis = new Redis({
    host,
    port,
    password,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });

  const patterns = [
    'questions:*',
    'question-sets:*',
    'vocabulary:*',
    'mock-exams:*',
  ];

  try {
    await redis.connect();
    for (const pattern of patterns) {
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          500,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
      console.log(`   🧹 Redis 캐시 무효화: ${pattern} → ${deleted}키`);
    }
  } finally {
    redis.disconnect();
  }
}

async function main() {
  if (!CDN_BASE) {
    console.error(
      '❌ MEDIA_CDN_BASE_URL 환경변수가 필요합니다. (예: https://dxxxxxxxx.cloudfront.net)',
    );
    process.exit(1);
  }

  console.log(
    `🔎 미디어 URL 마이그레이션 ${APPLY ? '적용(--apply)' : 'dry-run'} → CDN: ${CDN_BASE}`,
  );

  const updates = await collectPendingUpdates();
  const overflow = updates.filter((update) => update.to.length > URL_MAX_LENGTH);
  const applicable = updates.filter(
    (update) => update.to.length <= URL_MAX_LENGTH,
  );

  printReport(applicable, overflow);

  if (!APPLY) {
    console.log(
      '\n✅ dry-run 완료. 실제 적용은 `npm run media:migrate-urls -- --apply`',
    );
    return;
  }

  if (applicable.length === 0) {
    console.log('\n✅ 변경 대상이 없습니다. 이미 마이그레이션되었을 수 있습니다.');
    return;
  }

  const applied = await applyUpdates(applicable);
  console.log(`\n✅ DB 업데이트 완료: ${applied}건`);

  try {
    console.log('🧹 Redis 캐시 무효화 시작...');
    await invalidateRedisCaches();
  } catch (error) {
    console.warn(
      `⚠️  Redis 캐시 무효화 실패(자동 만료까지 최대 10분 지연될 수 있음): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  console.log('🎉 미디어 URL CDN 마이그레이션 완료');
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


