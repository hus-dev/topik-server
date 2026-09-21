// scripts/upload-media-to-s3.ts
// 로컬 미디어 파일(test/audio, test/photos, topik_data)을 AWS S3로 업로드하고,
// DB에 저장된 URL 커버리지를 검증한다.
//
// 사용법:
//   npm run media:upload                  # 업로드 + DB↔S3 커버리지 검사
//   npm run media:upload -- --dry-run     # 대상 파일 목록만 출력(업로드 없음)
//   npm run media:upload -- --check-only  # 업로드 없이 커버리지 검사만 수행
//   npm run media:upload -- --force       # S3에 이미 있어도 강제 재업로드
//
// 필요한 환경변수:
//   S3_MEDIA_BUCKET  업로드 대상 버킷 (필수)
//   AWS_REGION       기본 ap-northeast-2
// 자격 증명은 기본 AWS 자격 증명 체인(환경변수 / EC2 인스턴스 프로파일)을 사용한다.

import 'dotenv/config';
import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join, relative, sep } from 'path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type UploadTarget = {
  absolutePath: string;
  key: string;
  contentType: string;
  sizeBytes: number;
};

// 로컬 디렉터리 → S3 키 prefix 매핑 (topik_data 는 /topik-data/ 로 서빙된다)
const SOURCES: { localDir: string; keyPrefix: string }[] = [
  { localDir: 'test/audio', keyPrefix: 'test/audio' },
  { localDir: 'test/photos', keyPrefix: 'test/photos' },
  { localDir: 'topik_data', keyPrefix: 'topik-data' },
];

// topik_data 아래 원본 소스 디렉터리(test/audio 로 복사본이 존재)는 제외한다.
const EXCLUDED_DIR_PATTERN = /듣기파일/;
const EXCLUDED_FILES = new Set(['.DS_Store', 'Thumbs.db']);
const EXCLUDED_EXTENSIONS = new Set(['.aiff', '.aif']);

const CONTENT_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
};

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const UPLOAD_CONCURRENCY = Number(process.env.MEDIA_UPLOAD_CONCURRENCY ?? 6);
const BUCKET = (process.env.S3_MEDIA_BUCKET ?? '').trim();
const REGION = (process.env.AWS_REGION ?? 'ap-northeast-2').trim();

const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_ONLY = process.argv.includes('--check-only');
const FORCE = process.argv.includes('--force');

function collectTargets(): UploadTarget[] {
  const targets: UploadTarget[] = [];

  for (const source of SOURCES) {
    const baseDir = join(process.cwd(), source.localDir);
    let entries: string[];
    try {
      entries = walkFiles(baseDir, baseDir);
    } catch {
      console.warn(`⚠️  소스 디렉터리를 찾을 수 없어 건너뜁니다: ${source.localDir}`);
      continue;
    }

    for (const relativePath of entries) {
      const absolutePath = join(baseDir, relativePath);
      const key = `${source.keyPrefix}/${relativePath}`;
      const contentType =
        CONTENT_TYPES[extname(absolutePath).toLowerCase()] ??
        'application/octet-stream';
      targets.push({
        absolutePath,
        key,
        contentType,
        sizeBytes: statSync(absolutePath).size,
      });
    }
  }

  return targets;
}

function walkFiles(dir: string, baseDir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (EXCLUDED_DIR_PATTERN.test(entry)) continue;
      result.push(...walkFiles(fullPath, baseDir));
      continue;
    }
    if (EXCLUDED_FILES.has(entry)) continue;
    if (EXCLUDED_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
    result.push(relative(baseDir, fullPath).split(sep).join('/'));
  }
  return result;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

async function keyExists(
  s3: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const name = (error as { name?: string }).name ?? '';
    if (
      name === 'NotFound' ||
      name === 'NoSuchKey' ||
      name === '404' ||
      name === 'NoSuchBucket'
    ) {
      return false;
    }
    throw error;
  }
}

async function uploadTargets(
  s3: S3Client,
  bucket: string,
  targets: UploadTarget[],
): Promise<{ uploaded: number; skipped: number; failed: number }> {
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      try {
        if (!FORCE && (await keyExists(s3, bucket, target.key))) {
          skipped += 1;
          continue;
        }
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: target.key,
            Body: readFileSync(target.absolutePath),
            ContentType: target.contentType,
            CacheControl: CACHE_CONTROL,
          }),
        );
        uploaded += 1;
        if (uploaded % 25 === 0) {
          console.log(`  ... ${uploaded}/${targets.length} 업로드 완료`);
        }
      } catch (error) {
        failed += 1;
        console.error(`  ❌ 업로드 실패: ${target.key}`, error);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, UPLOAD_CONCURRENCY) }, () => worker()),
  );
  return { uploaded, skipped, failed };
}

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

// 레거시 별칭(/audio/...)을 정규화한다.
function normalizeRelativeUrl(url: string): string {
  if (url.startsWith('/audio/')) {
    return `/test/audio/${url.slice('/audio/'.length)}`;
  }
  return url;
}

function toS3Key(dbUrl: string): string | null {
  if (!dbUrl.startsWith('/')) return null;
  const withoutQuery = dbUrl.split('?')[0];
  const key = normalizeRelativeUrl(withoutQuery).replace(/^\/+/, '');
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

const KNOWN_KEY_PREFIXES = ['test/audio/', 'test/photos/', 'topik-data/'];

async function checkCoverage(
  s3: S3Client,
  bucket: string,
): Promise<{ checked: number; missing: string[]; unmapped: string[] }> {
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  });
  try {
    const [media, videos, vocabulary] = await Promise.all([
      prisma.question_media.findMany({ select: { url: true } }),
      prisma.explanation_videos.findMany({
        select: { video_url: true, thumbnail_url: true },
      }),
      prisma.vocabulary.findMany({ select: { tts_url: true } }),
    ]);

    const dbUrls = new Set<string>();
    for (const row of media) dbUrls.add(row.url);
    for (const row of videos) {
      if (row.video_url) dbUrls.add(row.video_url);
      if (row.thumbnail_url) dbUrls.add(row.thumbnail_url);
    }
    for (const row of vocabulary) {
      if (row.tts_url) dbUrls.add(row.tts_url);
    }

    const missing: string[] = [];
    const unmapped: string[] = [];
    let checked = 0;

    for (const dbUrl of Array.from(dbUrls).sort()) {
      if (dbUrl.startsWith('http')) continue;
      const key = toS3Key(dbUrl);
      if (!key) continue;
      if (!KNOWN_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        unmapped.push(dbUrl);
        continue;
      }
      checked += 1;
      if (!(await keyExists(s3, bucket, key))) {
        missing.push(key);
      }
    }

    return { checked, missing, unmapped };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  if (!BUCKET) {
    console.error(
      '❌ S3_MEDIA_BUCKET 환경변수가 필요합니다. (.env 또는 실행 시 지정)',
    );
    process.exit(1);
  }

  console.log(`🪣 버킷: s3://${BUCKET} (region: ${REGION})`);

  const s3 = new S3Client({ region: REGION });

  if (!CHECK_ONLY) {
    const targets = collectTargets();
    const totalBytes = targets.reduce((sum, t) => sum + t.sizeBytes, 0);
    console.log(
      `📦 업로드 대상: ${targets.length}개 파일, 총 ${formatBytes(totalBytes)}${
        DRY_RUN ? ' (dry-run)' : ''
      }`,
    );

    const byPrefix = new Map<string, number>();
    for (const target of targets) {
      const prefix = target.key.split('/').slice(0, 2).join('/');
      byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
    }
    for (const [prefix, count] of Array.from(byPrefix.entries()).sort()) {
      console.log(`   - ${prefix}/ : ${count}개`);
    }

    if (DRY_RUN) {
      for (const target of targets) {
        console.log(`   ${target.key} (${formatBytes(target.sizeBytes)})`);
      }
      console.log('✅ dry-run 완료. 실제 업로드는 --dry-run 없이 실행하세요.');
      return;
    }

    console.log('🚀 업로드 시작...');
    const result = await uploadTargets(s3, BUCKET, targets);
    console.log(
      `✅ 업로드 완료: 신규 ${result.uploaded} / 스킵(기존) ${result.skipped} / 실패 ${result.failed}`,
    );
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  }

  try {
    console.log('🔍 DB URL ↔ S3 커버리지 검사 시작...');
    const coverage = await checkCoverage(s3, BUCKET);
    console.log(
      `   검사 대상: ${coverage.checked}개 (외부 URL 제외) / 누락: ${coverage.missing.length}개`,
    );
    if (coverage.unmapped.length > 0) {
      console.log(
        `   ⚠️  알 수 없는 prefix의 DB URL ${coverage.unmapped.length}개:`,
      );
      for (const url of coverage.unmapped.slice(0, 10)) {
        console.log(`      ${url}`);
      }
    }
    if (coverage.missing.length > 0) {
      console.log('   ❌ S3에 없는 키:');
      for (const key of coverage.missing.slice(0, 50)) {
        console.log(`      ${key}`);
      }
      if (coverage.missing.length > 50) {
        console.log(`      ...외 ${coverage.missing.length - 50}개`);
      }
      process.exitCode = 1;
    } else {
      console.log('   ✅ 모든 DB 미디어 URL이 S3에 존재합니다.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (CHECK_ONLY) {
      console.error(`❌ 커버리지 검사 실패: ${message}`);
      process.exit(1);
    }
    console.warn(`⚠️  커버리지 검사 실패(DB 미연결 가능, 무시): ${message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


