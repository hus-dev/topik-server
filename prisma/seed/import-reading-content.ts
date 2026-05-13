import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type ReadingContentFile = {
  set: {
    title: string;
    section: string;
    level: number;
    source?: string;
    description?: string;
  };
  questions: ReadingQuestionInput[];
};

type ReadingQuestionInput = {
  question_number: number;
  level: number;
  question_type: string;
  passage?: string | null;
  prompt: string;
  question_text?: string | null;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: number;
  time_limit_seconds: number;
  tags?: string[];
};

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

function readContentFile(): ReadingContentFile {
  const filePath = join(
    process.cwd(),
    'content/topik2-reading-practice-1.json',
  );
  return JSON.parse(readFileSync(filePath, 'utf8')) as ReadingContentFile;
}

function validateContent(content: ReadingContentFile) {
  if (!content.set?.title) {
    throw new Error('Content set.title is required');
  }
  if (content.set.section !== 'reading') {
    throw new Error('Content set.section must be reading');
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

function buildPrompt(question: ReadingQuestionInput) {
  const parts = [question.prompt.trim()];
  if (question.question_text?.trim()) {
    parts.push(question.question_text.trim());
  }
  return parts.join('\n\n');
}

async function deleteExistingSet(title: string) {
  const existingSet = await prisma.question_sets.findFirst({
    where: { title },
    select: { id: true },
  });

  if (!existingSet) {
    return;
  }

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
      where: {
        question_id: { in: questionIds },
      },
    });
  }

  if (sessionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: {
        session_id: { in: sessionIds },
      },
    });
  }

  if (questionIds.length > 0) {
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

async function importContent(content: ReadingContentFile) {
  await deleteExistingSet(content.set.title);

  const timestamp = now();
  const set = await prisma.question_sets.create({
    data: {
      title: content.set.title,
      section: 'reading',
      level: content.set.level,
      created_at: timestamp,
      updated_at: timestamp,
    },
  });

  let passageCount = 0;
  let optionCount = 0;

  for (const question of content.questions) {
    const questionTimestamp = now();
    let passageId: string | undefined;

    if (question.passage?.trim()) {
      const passage = await prisma.question_passages.create({
        data: {
          title: `${content.set.title} - Passage ${question.question_number}`,
          content: question.passage.trim(),
          created_at: questionTimestamp,
          updated_at: questionTimestamp,
        },
      });
      passageId = passage.id;
      passageCount += 1;
    }

    await prisma.questions.create({
      data: {
        set_id: set.id,
        passage_id: passageId,
        section: 'reading',
        question_type: question.question_type,
        question_number: question.question_number,
        level: question.level,
        prompt: buildPrompt(question),
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
      },
    });

    optionCount += question.options.length;
  }

  return {
    setId: set.id,
    title: set.title,
    questions: content.questions.length,
    passages: passageCount,
    options: optionCount,
  };
}

async function main() {
  const content = readContentFile();
  validateContent(content);
  const result = await importContent(content);

  console.log('Reading content import completed.');
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
