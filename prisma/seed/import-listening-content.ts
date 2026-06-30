import 'dotenv/config';
import { execFileSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type ListeningContentFile = {
  set: {
    title: string;
    section: string;
    level: number;
    source?: string;
    description?: string;
  };
  questions: ListeningQuestionInput[];
};

type ListeningQuestionInput = {
  question_number: number;
  level: number;
  question_type: string;
  prompt: string;
  audio_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: number;
  time_limit_seconds: number;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getConnectionString()),
});

const now = () => BigInt(Date.now());
const audioDir = join(process.cwd(), 'test/audio/listening');
const audioUrlPrefix = '/test/audio/listening';
const audioSampleRate = 22050;
const audioChannels = 1;
const audioBitsPerSample = 16;
const femaleVoice = 'Yuna';
const maleVoice = 'Grandpa (Korean (South Korea))';
const narratorVoice = 'Yuna';

function readContentFile(): ListeningContentFile {
  const filePath = join(
    process.cwd(),
    'content/topik2-listening-practice-1.json',
  );
  return JSON.parse(readFileSync(filePath, 'utf8')) as ListeningContentFile;
}

function validateContent(content: ListeningContentFile) {
  if (!content.set?.title) {
    throw new Error('Content set.title is required');
  }
  if (content.set.section !== 'listening') {
    throw new Error('Content set.section must be listening');
  }
  if (
    !Number.isInteger(content.set.level) ||
    content.set.level < 1 ||
    content.set.level > 6
  ) {
    throw new Error('Content set.level must be an integer from 1 to 6');
  }
  if (!Array.isArray(content.questions) || content.questions.length === 0) {
    throw new Error('Content questions must be a non-empty array');
  }

  const questionNumbers = new Set<number>();

  for (const question of content.questions) {
    if (questionNumbers.has(question.question_number)) {
      throw new Error(`Duplicate question_number: ${question.question_number}`);
    }
    questionNumbers.add(question.question_number);

    if (
      !Number.isInteger(question.question_number) ||
      question.question_number < 1
    ) {
      throw new Error(`Invalid question_number: ${question.question_number}`);
    }
    if (
      !Number.isInteger(question.level) ||
      question.level < 1 ||
      question.level > 6
    ) {
      throw new Error(
        `Question ${question.question_number}: level must be 1-6`,
      );
    }
    if (question.question_type !== 'multiple_choice') {
      throw new Error(
        `Question ${question.question_number}: only multiple_choice is supported`,
      );
    }
    if (!question.prompt?.trim()) {
      throw new Error(
        `Question ${question.question_number}: prompt is required`,
      );
    }
    if (!question.audio_text?.trim()) {
      throw new Error(
        `Question ${question.question_number}: audio_text is required`,
      );
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(
        `Question ${question.question_number}: exactly 4 options are required`,
      );
    }
    if (!['1', '2', '3', '4'].includes(question.correct_answer)) {
      throw new Error(
        `Question ${question.question_number}: correct_answer must be 1, 2, 3, or 4`,
      );
    }
    if (!question.explanation?.trim()) {
      throw new Error(
        `Question ${question.question_number}: explanation is required`,
      );
    }
    if (
      !Number.isInteger(question.difficulty) ||
      question.difficulty < 1 ||
      question.difficulty > 5
    ) {
      throw new Error(
        `Question ${question.question_number}: difficulty must be 1-5`,
      );
    }
    if (
      !Number.isInteger(question.time_limit_seconds) ||
      question.time_limit_seconds < 1
    ) {
      throw new Error(
        `Question ${question.question_number}: time_limit_seconds must be positive`,
      );
    }
  }
}

function audioFileName(questionNumber: number) {
  return `topik2-listening-practice-1-q${String(questionNumber).padStart(2, '0')}.wav`;
}

function parseAudioSegments(audioText: string) {
  const matches = [...audioText.matchAll(/(여자|남자):\s*/g)];

  if (matches.length === 0) {
    return [{ speaker: 'narrator', text: audioText.trim() }];
  }

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1];
      const textStart = (match.index ?? 0) + match[0].length;
      const textEnd = nextMatch?.index ?? audioText.length;

      return {
        speaker: match[1],
        text: audioText.slice(textStart, textEnd).trim(),
      };
    })
    .filter((segment) => segment.text.length > 0);
}

function voiceForSpeaker(speaker: string) {
  if (speaker === '남자') return maleVoice;
  if (speaker === '여자') return femaleVoice;
  return narratorVoice;
}

function readWavData(filePath: string) {
  const wav = readFileSync(filePath);
  const dataOffset = wav.indexOf(Buffer.from('data'));

  if (dataOffset < 0) {
    throw new Error(`WAV data chunk not found: ${filePath}`);
  }

  const dataSize = wav.readUInt32LE(dataOffset + 4);
  return wav.subarray(dataOffset + 8, dataOffset + 8 + dataSize);
}

function createSilence(milliseconds: number) {
  const bytesPerSample = audioBitsPerSample / 8;
  const sampleCount = Math.floor((audioSampleRate * milliseconds) / 1000);
  return Buffer.alloc(sampleCount * audioChannels * bytesPerSample);
}

function writePcmWav(filePath: string, pcmData: Buffer) {
  const bytesPerSample = audioBitsPerSample / 8;
  const byteRate = audioSampleRate * audioChannels * bytesPerSample;
  const blockAlign = audioChannels * bytesPerSample;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(audioChannels, 22);
  header.writeUInt32LE(audioSampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(audioBitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);

  writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

function ensureAudioFile(question: ListeningQuestionInput) {
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
  }

  const fileName = audioFileName(question.question_number);
  const filePath = join(audioDir, fileName);
  const baseName = fileName.replace(/\.wav$/, '');
  const segments = parseAudioSegments(question.audio_text);
  const pcmParts: Buffer[] = [createSilence(450)];

  for (const [index, segment] of segments.entries()) {
    const tempAiffPath = join(audioDir, `${baseName}.segment-${index}.aiff`);
    const tempWavPath = join(audioDir, `${baseName}.segment-${index}.wav`);

    execFileSync(
      'say',
      [
        '-v',
        voiceForSpeaker(segment.speaker),
        '-r',
        '150',
        '-o',
        tempAiffPath,
        segment.text,
      ],
      {
        stdio: 'ignore',
      },
    );
    execFileSync(
      'afconvert',
      ['-f', 'WAVE', '-d', 'LEI16@22050', tempAiffPath, tempWavPath],
      {
        stdio: 'ignore',
      },
    );

    const wavData = readWavData(tempWavPath);
    if (wavData.length === 0) {
      throw new Error(
        `Generated empty audio segment for question ${question.question_number}`,
      );
    }

    pcmParts.push(wavData);
    pcmParts.push(createSilence(index === segments.length - 1 ? 350 : 650));

    unlinkSync(tempAiffPath);
    unlinkSync(tempWavPath);
  }

  writePcmWav(filePath, Buffer.concat(pcmParts));

  return `${audioUrlPrefix}/${fileName}`;
}

async function deleteExistingSet(title: string) {
  const existingSet = await prisma.question_sets.findFirst({
    where: { title },
    select: { id: true },
  });

  if (!existingSet) return;

  const existingQuestions = await prisma.questions.findMany({
    where: { set_id: existingSet.id },
    select: { id: true, passage_id: true },
  });
  const questionIds = existingQuestions.map((question) => question.id);
  const passageIds = existingQuestions
    .map((question) => question.passage_id)
    .filter((id): id is string => Boolean(id));
  const sessions = await prisma.exam_sessions.findMany({
    where: { set_id: existingSet.id },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

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

  if (sessionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { session_id: { in: sessionIds } },
    });
    await prisma.exam_sessions.deleteMany({
      where: { id: { in: sessionIds } },
    });
  }

  await prisma.question_sets.delete({
    where: { id: existingSet.id },
  });

  if (passageIds.length > 0) {
    await prisma.question_passages.deleteMany({
      where: { id: { in: passageIds } },
    });
  }
}

async function importContent(content: ListeningContentFile) {
  await deleteExistingSet(content.set.title);

  const timestamp = now();
  const set = await prisma.question_sets.create({
    data: {
      title: content.set.title,
      section: 'listening',
      level: content.set.level,
      exam_kind: 'practice',
      created_at: timestamp,
      updated_at: timestamp,
    },
  });

  let optionCount = 0;
  let audioCount = 0;

  for (const question of content.questions) {
    const questionTimestamp = now();
    const audioUrl = ensureAudioFile(question);

    await prisma.questions.create({
      data: {
        set_id: set.id,
        section: 'listening',
        question_type: question.question_type,
        question_number: question.question_number,
        level: question.level,
        prompt: question.prompt,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        time_limit_seconds: question.time_limit_seconds,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: questionTimestamp,
        updated_at: questionTimestamp,
        question_options: {
          create: question.options.map((option, index) => ({
            option_number: index + 1,
            content: option,
            is_correct: String(index + 1) === question.correct_answer ? 1 : 0,
          })),
        },
        question_media: {
          create: {
            media_type: 'audio',
            url: audioUrl,
            transcript: question.audio_text,
            sort_order: 1,
            created_at: questionTimestamp,
            updated_at: questionTimestamp,
          },
        },
      },
    });

    optionCount += question.options.length;
    audioCount += 1;
  }

  return {
    setId: set.id,
    title: set.title,
    questions: content.questions.length,
    options: optionCount,
    audioFiles: audioCount,
  };
}

async function main() {
  const content = readContentFile();
  validateContent(content);
  const result = await importContent(content);

  console.log('Listening content import completed.');
  console.log(JSON.stringify(result, null, 2));
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
