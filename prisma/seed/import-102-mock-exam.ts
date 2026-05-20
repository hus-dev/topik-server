import 'dotenv/config';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const readingSetId = 'topik2-102-reading';
const listeningSetId = 'topik2-102-listening';
const setIds = [readingSetId, listeningSetId];

const topikDataDir = join(process.cwd(), 'topik_data');
const sourceAudioDir = join(topikDataDir, '제102회 TOPIK2 듣기파일');
const publicAudioDir = join(process.cwd(), 'test/audio/topik2-102');
const publicAudioPrefix = '/test/audio/topik2-102';

const readingPdfName = '제102회_문제지 TOPIK2_2교시_읽기_탑재용.pdf';
const listeningPdfName = '제102회_문제지_TOPIK2_1교시_듣기 통합_탑재용.pdf';
const answerPdfName = '제102회_정답 및 배점표_TOPIK2_탑재용.pdf';

const readingPdfUrl = `/topik-data/${encodeURIComponent(readingPdfName)}`;
const listeningPdfUrl = `/topik-data/${encodeURIComponent(listeningPdfName)}`;
const answerPdfUrl = `/topik-data/${encodeURIComponent(answerPdfName)}`;
const readingOcrPath = join(
  process.cwd(),
  'content/topik2-102/reading-ocr.txt',
);
const listeningOcrPath = join(
  process.cwd(),
  'content/topik2-102/listening-ocr.txt',
);

const readingAnswers = [
  '1',
  '1',
  '4',
  '2',
  '1',
  '3',
  '2',
  '1',
  '2',
  '4',
  '2',
  '1',
  '1',
  '2',
  '1',
  '2',
  '1',
  '1',
  '1',
  '4',
  '2',
  '3',
  '1',
  '4',
  '2',
  '2',
  '3',
  '4',
  '3',
  '3',
  '4',
  '1',
  '3',
  '4',
  '3',
  '3',
  '4',
  '4',
  '3',
  '2',
  '4',
  '2',
  '1',
  '2',
  '1',
  '3',
  '2',
  '4',
  '4',
  '3',
];

const listeningAnswers = [
  '2',
  '1',
  '3',
  '2',
  '4',
  '3',
  '1',
  '1',
  '4',
  '2',
  '4',
  '2',
  '4',
  '1',
  '3',
  '2',
  '4',
  '4',
  '1',
  '4',
  '2',
  '1',
  '2',
  '3',
  '2',
  '2',
  '3',
  '4',
  '2',
  '3',
  '3',
  '4',
  '1',
  '1',
  '2',
  '3',
  '1',
  '4',
  '4',
  '2',
  '2',
  '3',
  '1',
  '2',
  '3',
  '3',
  '2',
  '1',
  '4',
  '4',
];

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }
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

function assertFileExists(path: string) {
  if (!existsSync(path)) {
    throw new Error(`Required file not found: ${path}`);
  }
}

function copyListeningAudio() {
  mkdirSync(publicAudioDir, { recursive: true });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const sourceName = `2-${questionNumber.toString().padStart(2, '0')}.mp3`;
    const targetName = `listening-q${questionNumber
      .toString()
      .padStart(2, '0')}.mp3`;
    const sourcePath = join(sourceAudioDir, sourceName);
    const targetPath = join(publicAudioDir, targetName);

    assertFileExists(sourcePath);
    copyFileSync(sourcePath, targetPath);
  }
}

async function cleanupExistingData() {
  const sessions = await prisma.exam_sessions.findMany({
    where: { set_id: { in: setIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  const questions = await prisma.questions.findMany({
    where: { set_id: { in: setIds } },
    select: { id: true, passage_id: true },
  });
  const questionIds = questions.map((question) => question.id);
  const passageIds = questions
    .map((question) => question.passage_id)
    .filter((id): id is string => Boolean(id));

  if (sessionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { session_id: { in: sessionIds } },
    });
  }

  if (questionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.user_questions.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_options.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_media.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.explanation_videos.deleteMany({
      where: {
        OR: [
          { question_id: { in: questionIds } },
          { set_id: { in: setIds } },
        ],
      },
    });
    await prisma.questions.deleteMany({
      where: { id: { in: questionIds } },
    });
  } else {
    await prisma.explanation_videos.deleteMany({
      where: { set_id: { in: setIds } },
    });
  }

  if (sessionIds.length > 0) {
    await prisma.exam_sessions.deleteMany({
      where: { id: { in: sessionIds } },
    });
  }

  await prisma.question_sets.deleteMany({
    where: { id: { in: setIds } },
  });

  if (passageIds.length > 0) {
    await prisma.question_passages.deleteMany({
      where: { id: { in: passageIds } },
    });
  }
}

function cleanOcrLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^Test o[tf] .*$/i, '')
    .replace(/^O TOPIK .*$/i, '')
    .replace(/^TOPIK 제102회.*$/i, '')
    .replace(/^제102회 한국어능력시험.*$/i, '')
    .trim();
}

function loadOcrLines(path: string) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => {
      if (!line) return false;
      if (/^PAGES \d+$/.test(line)) return false;
      if (/^---PAGE \d+---$/.test(line)) return false;
      if (/^\d+$/.test(line)) return false;
      return true;
    });
}

function findQuestionStart(
  lines: string[],
  questionNumber: number,
  fromIndex = 0,
) {
  if (questionNumber === 7) {
    const readingSevenIndex = lines
      .slice(fromIndex)
      .findIndex((line) => /^l 전기 절약$/.test(line));
    if (readingSevenIndex >= 0) {
      return fromIndex + readingSevenIndex;
    }
  }

  const questionMarker = new RegExp(`^${questionNumber}\\.\\s*`);
  const relativeIndex = lines
    .slice(fromIndex)
    .findIndex((line) => questionMarker.test(line));

  return relativeIndex < 0 ? -1 : fromIndex + relativeIndex;
}

function findNextQuestionStart(
  lines: string[],
  questionNumber: number,
  fromIndex: number,
) {
  for (
    let nextQuestionNumber = questionNumber + 1;
    nextQuestionNumber <= 50;
    nextQuestionNumber += 1
  ) {
    const nextStart = findQuestionStart(lines, nextQuestionNumber, fromIndex);
    if (nextStart >= 0) return nextStart;
  }

  return -1;
}

function parseQuestionRange(line: string) {
  const match = line.match(/(\d+)\s*~\s*(\d+)/);
  if (!match) return null;

  let start = Number(match[1]);
  let end = Number(match[2]);

  if (start > end && start >= 10 && start % 10 <= end) {
    start %= 10;
  }
  if (end > 50) {
    end = Number(String(end).slice(0, 2));
  }

  if (start < 1 || end < start || start > 50) return null;
  return { start, end: Math.min(end, 50) };
}

function findGroupInstructionStart(
  lines: string[],
  questionNumber: number,
  fromIndex: number,
  questionStart: number,
) {
  for (let index = questionStart - 1; index >= fromIndex; index -= 1) {
    const line = lines[index];
    if (!line.startsWith('※')) continue;

    const range = parseQuestionRange(line);
    if (
      range &&
      range.start <= questionNumber &&
      questionNumber <= range.end
    ) {
      const firstQuestionStart = findNextQuestionStart(
        lines,
        0,
        index + 1,
      );
      return {
        instructionStart: index,
        firstQuestionStart:
          firstQuestionStart >= 0 ? firstQuestionStart : questionStart,
      };
    }
  }

  return null;
}

function questionChunk(
  lines: string[],
  questionNumber: number,
  section: 'reading' | 'listening',
) {
  const contentStart =
    section === 'reading'
      ? lines.findIndex((line) => line.includes('읽기 (1번 ~50번)'))
      : 0;
  const fromIndex = contentStart >= 0 ? contentStart : 0;
  let start = findQuestionStart(lines, questionNumber, fromIndex);

  if (start < 0 && section === 'listening' && questionNumber === 1) {
    start = lines.findIndex((line) => line.includes('듣기 통합 (1번 ~ 50번)'));
    if (start >= 0) start += 1;
  }

  if (start < 0) {
    return `${section === 'reading' ? '읽기' : '듣기'} ${questionNumber}번 OCR 원문을 확인하지 못했습니다. PDF 원문을 question_media에서 확인하십시오.`;
  }

  const nextStart = findNextQuestionStart(lines, questionNumber, start + 1);
  let end = nextStart > start ? nextStart : lines.length;
  const nextInstructionIndex = lines
    .slice(start + 1, end)
    .findIndex((line) => line.startsWith('※'));

  if (nextInstructionIndex >= 0) {
    end = start + 1 + nextInstructionIndex;
  }

  const group = findGroupInstructionStart(
    lines,
    questionNumber,
    fromIndex,
    start,
  );
  const chunkLines =
    group && group.instructionStart < start
      ? [
          ...lines.slice(group.instructionStart, group.firstQuestionStart),
          ...lines.slice(start, end),
        ]
      : lines.slice(start, end);

  return normalizeQuestionChunk(chunkLines.join('\n').trim(), questionNumber, section);
}

function normalizeQuestionChunk(
  chunk: string,
  questionNumber: number,
  section: 'reading' | 'listening',
) {
  let normalized = chunk.replace(/\nl /g, '\n① ');

  if (section === 'reading' && questionNumber === 7) {
    normalized = normalized
      .replace(/^(?:l|①) 전기 절약/, '7.\n① 전기 절약')
      .replace(/\n(?:l|①) 전기 절약/, '\n7.\n① 전기 절약')
      .replace(/\n환경 보호$/, '\n④ 환경 보호');
  }

  return normalized;
}

function normalizeOptionMarkers(text: string) {
  return `\n${text}\n`
    .replace(/①/g, '\n① ')
    .replace(/②/g, '\n② ')
    .replace(/③/g, '\n③ ')
    .replace(/④/g, '\n④ ')
    .replace(/\n\s*[1lI]\s+/g, '\n① ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textPreview(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function manualOptions(section: 'reading' | 'listening', questionNumber: number) {
  if (section === 'reading' && questionNumber === 6) {
    return new Map([
      ['1', '은행'],
      ['2', '시장'],
      ['3', '세탁소'],
      ['4', '가구점'],
    ]);
  }

  if (section === 'reading' && questionNumber === 7) {
    return new Map([
      ['1', '전기 절약'],
      ['2', '건강 관리'],
      ['3', '생활 예절'],
      ['4', '환경 보호'],
    ]);
  }

  return null;
}

function extractOptionContent(
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const manual = manualOptions(section, questionNumber);
  if (manual) return manual;

  const normalized = normalizeOptionMarkers(chunk).replace(
    /^([①②③④])[ \t]*/gm,
    (_marker, optionMarker: string) =>
      `@@${{ '①': '1', '②': '2', '③': '3', '④': '4' }[optionMarker] ?? ''}@@ `,
  );

  const matches = [...normalized.matchAll(/@@([1-4])@@/g)];
  const options = new Map<string, string>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const optionNumber = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const content = normalized
      .slice(start, end)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false;
        if (line.includes('고르십시오')) return false;
        if (line.includes('각 2점')) return false;
        if (/^\)/.test(line)) return false;
        return true;
      })
      .join('\n')
      .trim();

    if (!options.has(optionNumber) && content) {
      options.set(optionNumber, textPreview(content, 1000));
    }
  }

  return options;
}

function questionPassageContent(
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const normalized = normalizeOptionMarkers(chunk);
  const optionNumbers = new Set(['1', '2', '3', '4']);
  const lines = normalized.split('\n');
  const keptLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const optionMatch = trimmed.match(/^([①②③④])\s*(.*)$/);

    if (optionMatch) {
      const optionNumber =
        { '①': '1', '②': '2', '③': '3', '④': '4' }[optionMatch[1]] ?? '';
      const optionText = optionMatch[2].trim();

      if (optionNumbers.has(optionNumber)) {
        continue;
      }

      if (optionText) keptLines.push(optionText);
      continue;
    }

    keptLines.push(line);
  }

  let content = keptLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (section === 'reading' && questionNumber === 6) {
    content = content.replace(/^6\.\s*/m, '6.\n');
  }

  return content;
}

function optionRows(
  correctAnswer: string,
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const ocrOptions = extractOptionContent(chunk, section, questionNumber);

  return ['1', '2', '3', '4'].map((option) => ({
    option_number: Number(option),
    content: ocrOptions.get(option) ?? option,
    is_correct: option === correctAnswer ? 1 : 0,
  }));
}

async function createReadingSet(now: bigint, readingOcrLines: string[]) {
  await prisma.question_sets.create({
    data: {
      id: readingSetId,
      title: '제102회 TOPIK II 읽기 모의고사',
      section: 'reading',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 102,
      created_at: now,
      updated_at: now,
    },
  });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const questionId = `${readingSetId}-q${questionNumber
      .toString()
      .padStart(2, '0')}`;
    const passageId = `${questionId}-passage`;
    const chunk = questionChunk(readingOcrLines, questionNumber, 'reading');

    await prisma.question_passages.create({
      data: {
        id: passageId,
        title: `제102회 TOPIK II 읽기 ${questionNumber}번`,
        content: questionPassageContent(chunk, 'reading', questionNumber),
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.questions.create({
      data: {
        id: questionId,
        set_id: readingSetId,
        passage_id: passageId,
        section: 'reading',
        question_type: 'multiple_choice',
        question_number: questionNumber,
        level: 4,
        prompt: '',
        correct_answer: readingAnswers[questionNumber - 1],
        explanation: `정답은 ${readingAnswers[questionNumber - 1]}번입니다. 원문 문제지는 question_media의 PDF를 확인하십시오. 정답표: ${answerPdfUrl}`,
        difficulty: 3,
        time_limit_seconds: 84,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: now,
        updated_at: now,
        question_options: {
          create: optionRows(
            readingAnswers[questionNumber - 1],
            chunk,
            'reading',
            questionNumber,
          ),
        },
        question_media: {
          create: {
            media_type: 'document',
            url: readingPdfUrl,
            transcript: `제102회 TOPIK II 읽기 PDF 원문`,
            sort_order: 1,
            created_at: now,
            updated_at: now,
          },
        },
      },
    });
  }
}

async function createListeningSet(now: bigint, listeningOcrLines: string[]) {
  await prisma.question_sets.create({
    data: {
      id: listeningSetId,
      title: '제102회 TOPIK II 듣기 모의고사',
      section: 'listening',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 3600,
      price: 0,
      is_free: 1,
      display_order: 102,
      created_at: now,
      updated_at: now,
    },
  });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const questionId = `${listeningSetId}-q${questionNumber
      .toString()
      .padStart(2, '0')}`;
    const passageId = `${questionId}-passage`;
    const audioName = `listening-q${questionNumber
      .toString()
      .padStart(2, '0')}.mp3`;
    const chunk = questionChunk(listeningOcrLines, questionNumber, 'listening');

    await prisma.question_passages.create({
      data: {
        id: passageId,
        title: `제102회 TOPIK II 듣기 ${questionNumber}번`,
        content: questionPassageContent(chunk, 'listening', questionNumber),
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.questions.create({
      data: {
        id: questionId,
        set_id: listeningSetId,
        passage_id: passageId,
        section: 'listening',
        question_type: 'multiple_choice',
        question_number: questionNumber,
        level: 4,
        prompt: '',
        correct_answer: listeningAnswers[questionNumber - 1],
        explanation: `정답은 ${listeningAnswers[questionNumber - 1]}번입니다. 문제지는 question_media의 PDF를 확인하십시오. 정답표: ${answerPdfUrl}`,
        difficulty: 3,
        time_limit_seconds: 72,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: now,
        updated_at: now,
        question_options: {
          create: optionRows(
            listeningAnswers[questionNumber - 1],
            chunk,
            'listening',
            questionNumber,
          ),
        },
        question_media: {
          create: [
            {
              media_type: 'audio',
              url: `${publicAudioPrefix}/${audioName}`,
              transcript: `제102회 TOPIK II 듣기 ${questionNumber}번 공식 MP3`,
              sort_order: 1,
              created_at: now,
              updated_at: now,
            },
            {
              media_type: 'document',
              url: listeningPdfUrl,
              transcript: '제102회 TOPIK II 듣기 통합 PDF 원문',
              sort_order: 2,
              created_at: now,
              updated_at: now,
            },
          ],
        },
      },
    });
  }
}

async function main() {
  assertFileExists(join(topikDataDir, readingPdfName));
  assertFileExists(join(topikDataDir, listeningPdfName));
  assertFileExists(join(topikDataDir, answerPdfName));
  assertFileExists(readingOcrPath);
  assertFileExists(listeningOcrPath);

  if (readingAnswers.length !== 50 || listeningAnswers.length !== 50) {
    throw new Error('Expected exactly 50 reading and 50 listening answers');
  }

  copyListeningAudio();
  await cleanupExistingData();

  const now = BigInt(Date.now());
  const readingOcrLines = loadOcrLines(readingOcrPath);
  const listeningOcrLines = loadOcrLines(listeningOcrPath);
  await createReadingSet(now, readingOcrLines);
  await createListeningSet(now, listeningOcrLines);

  console.log('102nd TOPIK II mock exam import completed.');
  console.log(
    JSON.stringify(
      {
        reading_set_id: readingSetId,
        listening_set_id: listeningSetId,
        reading_questions: 50,
        listening_questions: 50,
        audio_url_example: `${publicAudioPrefix}/listening-q01.mp3`,
        reading_pdf_url: readingPdfUrl,
        listening_pdf_url: listeningPdfUrl,
      },
      null,
      2,
    ),
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
