import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

type SeedSet = {
  id: string;
  title: string;
  section: 'reading' | 'listening';
  level: number;
  exam_kind: 'mock' | 'type';
  total_questions: number;
  duration_seconds: number;
  price: number;
  is_free: number;
  display_order: number;
};

type SeedPassage = {
  id: string;
  title: string;
  content: string;
  translation: string;
  created_at: bigint;
  updated_at: bigint;
};

type SeedQuestion = {
  id: string;
  set_id: string;
  passage_id: string | null;
  section: 'reading' | 'listening';
  question_type: string;
  question_number: number;
  level: number;
  prompt: string;
  correct_answer: string;
  explanation: string;
  ai_explanation: string;
  difficulty: number;
  time_limit_seconds: number;
  is_ai_generated: number;
  is_downloaded: number;
  created_at: bigint;
  updated_at: bigint;
};

type SeedOption = {
  id: string;
  question_id: string;
  option_number: number;
  content: string;
  is_correct: number;
};

type SeedMedia = {
  id: string;
  question_id: string;
  media_type: string;
  url: string;
  duration_seconds: number;
  transcript: string;
  sort_order: number;
  created_at: bigint;
  updated_at: bigint;
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);

  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (
    url.hostname === 'localhost' ||
    url.hostname === '::1' ||
    url.hostname === '[::1]'
  ) {
    url.hostname = '127.0.0.1';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  });
}

function timestamp(base: bigint, offset: number) {
  return base + BigInt(offset);
}

function buildOptions(question: SeedQuestion): SeedOption[] {
  const correctNumber = Number(question.correct_answer);

  return Array.from({ length: 4 }, (_, index) => {
    const optionNumber = index + 1;
    return {
      id: `${question.id}-o${optionNumber}`,
      question_id: question.id,
      option_number: optionNumber,
      content: `보기 ${optionNumber}`,
      is_correct: optionNumber === correctNumber ? 1 : 0,
    };
  });
}

function buildReadingPassages(set: SeedSet, baseTime: bigint): SeedPassage[] {
  const passageCount = set.total_questions / 5;

  return Array.from({ length: passageCount }, (_, index) => {
    const passageNumber = index + 1;
    return {
      id: `${set.id}-p${passageNumber}`,
      title: `${set.title} 지문 ${passageNumber}`,
      content: `${set.title}의 ${passageNumber}번째 지문입니다. 모의고사 화면과 API를 확인하기 위한 예시 문단입니다. 문장은 짧고 단순하지만 지문-문제 관계를 검증하기에는 충분합니다.`,
      translation: `This is passage ${passageNumber} for ${set.title}.`,
      created_at: timestamp(baseTime, passageNumber * 1000),
      updated_at: timestamp(baseTime, passageNumber * 1000),
    };
  });
}

function buildReadingQuestions(
  set: SeedSet,
  passages: SeedPassage[],
  baseTime: bigint,
): SeedQuestion[] {
  return Array.from({ length: set.total_questions }, (_, index) => {
    const questionNumber = index + 1;
    const passageIndex = Math.floor(index / 5);
    const correctAnswer = String((index % 4) + 1);

    return {
      id: `${set.id}-q${questionNumber}`,
      set_id: set.id,
      passage_id: passages[passageIndex]?.id ?? null,
      section: 'reading' as const,
      question_type: 'multiple_choice',
      question_number: questionNumber,
      level: set.level,
      prompt: `${set.title} ${questionNumber}번. 다음 글을 읽고 물음에 답하십시오.`,
      correct_answer: correctAnswer,
      explanation: `정답은 ${correctAnswer}번입니다.`,
      ai_explanation: `이 문항은 ${set.title}의 ${questionNumber}번 예시입니다.`,
      difficulty: set.level,
      time_limit_seconds: set.exam_kind === 'mock' ? 84 : 20,
      is_ai_generated: 0,
      is_downloaded: 1,
      created_at: timestamp(baseTime, questionNumber * 1000),
      updated_at: timestamp(baseTime, questionNumber * 1000),
    };
  });
}

function buildListeningQuestions(
  set: SeedSet,
  baseTime: bigint,
): { questions: SeedQuestion[]; media: SeedMedia[] } {
  const questions = Array.from({ length: set.total_questions }, (_, index) => {
    const questionNumber = index + 1;
    const correctAnswer = String((index % 4) + 1);
    return {
      id: `${set.id}-q${questionNumber}`,
      set_id: set.id,
      passage_id: null,
      section: 'listening' as const,
      question_type: 'multiple_choice',
      question_number: questionNumber,
      level: set.level,
      prompt: `${set.title} ${questionNumber}번. 다음을 듣고 물음에 답하십시오.`,
      correct_answer: correctAnswer,
      explanation: `정답은 ${correctAnswer}번입니다.`,
      ai_explanation: `이 문항은 ${set.title}의 ${questionNumber}번 듣기 예시입니다.`,
      difficulty: set.level,
      time_limit_seconds: set.exam_kind === 'mock' ? 42 : 25,
      is_ai_generated: 0,
      is_downloaded: 1,
      created_at: timestamp(baseTime, questionNumber * 1000),
      updated_at: timestamp(baseTime, questionNumber * 1000),
    };
  });

  const media = questions.map((question, index) => ({
    id: `${set.id}-m${index + 1}`,
    question_id: question.id,
    media_type: 'audio',
    url: `https://cdn.topik.local/mock-exams/${set.id}/${index + 1}.mp3`,
    duration_seconds: 30 + ((index + 1) % 6) * 3,
    transcript: `${set.title} ${index + 1}번 듣기 예시입니다.`,
    sort_order: 1,
    created_at: timestamp(baseTime, (index + 1) * 1000),
    updated_at: timestamp(baseTime, (index + 1) * 1000),
  }));

  return { questions, media };
}

async function ensureSeedUser(params: {
  prisma: PrismaClient;
  email: string;
  provider_id: string;
  nickname: string;
  role: 'user' | 'admin';
  password: string;
}) {
  const { prisma, email, provider_id, nickname, role, password } = params;
  const now = BigInt(Date.now());
  const password_hash = await bcrypt.hash(password, 10);

  const existing = await prisma.users.findFirst({
    where: {
      provider: 'local',
      provider_id,
    },
  });

  if (existing) {
    return prisma.users.update({
      where: { id: existing.id },
      data: {
        email,
        nickname,
        role,
        password_hash,
        updated_at: now,
      },
    });
  }

  return prisma.users.create({
    data: {
      email,
      password_hash,
      provider: 'local',
      provider_id,
      nickname,
      role,
      target_level: 3,
      language_code: 'ko',
      timezone: 'Asia/Seoul',
      timer_mode: 'countdown',
      created_at: now,
      updated_at: now,
    },
  });
}

async function main() {
  const prisma = createPrismaClient();
  const baseTime = BigInt(Date.now());

  const sets: SeedSet[] = [
    {
      id: 'rm1',
      title: '모의고사 1',
      section: 'reading',
      level: 3,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'rm2',
      title: '모의고사 2',
      section: 'reading',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 50,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'rt12',
      title: '1-2번',
      section: 'reading',
      level: 3,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 600,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'rt34',
      title: '3-4번',
      section: 'reading',
      level: 4,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 600,
      price: 30,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'rt58',
      title: '5-8번',
      section: 'reading',
      level: 5,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 750,
      price: 30,
      is_free: 0,
      display_order: 3,
    },
    {
      id: 'rt910',
      title: '9-10번',
      section: 'reading',
      level: 6,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 1800,
      price: 30,
      is_free: 0,
      display_order: 4,
    },
    {
      id: 'lm1',
      title: '모의고사 1',
      section: 'listening',
      level: 3,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'lm2',
      title: '모의고사 2',
      section: 'listening',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 50,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'lt12',
      title: '1-2번',
      section: 'listening',
      level: 3,
      exam_kind: 'type',
      total_questions: 10,
      duration_seconds: 600,
      price: 30,
      is_free: 0,
      display_order: 1,
    },
    {
      id: 'lt34',
      title: '3-4번',
      section: 'listening',
      level: 4,
      exam_kind: 'type',
      total_questions: 10,
      duration_seconds: 600,
      price: 30,
      is_free: 0,
      display_order: 2,
    },
  ];

  try {
    await prisma.answers.deleteMany();
    await prisma.exam_sessions.deleteMany();
    await prisma.question_media.deleteMany();
    await prisma.question_options.deleteMany();
    await prisma.questions.deleteMany();
    await prisma.question_passages.deleteMany();
    await prisma.question_sets.deleteMany();

    await ensureSeedUser({
      prisma,
      email: 'mock-admin@topik.local',
      provider_id: 'mock-seed-admin',
      nickname: 'Mock Admin',
      role: 'admin',
      password: 'Admin1234!',
    });

    const user = await ensureSeedUser({
      prisma,
      email: 'mock-user@topik.local',
      provider_id: 'mock-seed-user',
      nickname: 'Mock User',
      role: 'user',
      password: 'User1234!',
    });

    await prisma.question_sets.createMany({
      data: sets.map((set) => ({
        id: set.id,
        title: set.title,
        section: set.section,
        level: set.level,
        exam_kind: set.exam_kind,
        total_questions: set.total_questions,
        duration_seconds: set.duration_seconds,
        price: set.price,
        is_free: set.is_free,
        display_order: set.display_order,
        created_at: timestamp(baseTime, set.display_order * 1000),
        updated_at: timestamp(baseTime, set.display_order * 1000),
      })),
    });

    const passages: SeedPassage[] = [];
    const questions: SeedQuestion[] = [];
    const options: SeedOption[] = [];
    const media: SeedMedia[] = [];

    for (const set of sets.filter((item) => item.section === 'reading')) {
      const setPassages = buildReadingPassages(set, baseTime);
      const setQuestions = buildReadingQuestions(set, setPassages, baseTime);
      passages.push(...setPassages);
      questions.push(...setQuestions);
      setQuestions.forEach((question) => {
        options.push(...buildOptions(question));
      });
    }

    for (const set of sets.filter((item) => item.section === 'listening')) {
      const { questions: setQuestions, media: setMedia } =
        buildListeningQuestions(set, baseTime);
      questions.push(...setQuestions);
      media.push(...setMedia);
      setQuestions.forEach((question) => {
        options.push(...buildOptions(question));
      });
    }

    await prisma.question_passages.createMany({
      data: passages,
    });

    await prisma.questions.createMany({
      data: questions,
    });

    await prisma.question_options.createMany({
      data: options,
    });

    await prisma.question_media.createMany({
      data: media,
    });

    const activeSet = sets.find((set) => set.id === 'rm1');
    if (!activeSet) {
      throw new Error('Active mock exam seed set was not found');
    }

    const activeQuestions = await prisma.questions.findMany({
      where: { set_id: activeSet.id },
      orderBy: { question_number: 'asc' },
    });

    const sessionStartedAt = timestamp(baseTime, -42_000);
    const session = await prisma.exam_sessions.create({
      data: {
        user_id: user.id,
        mode: 'mock',
        section: activeSet.section,
        set_id: activeSet.id,
        total_questions: activeSet.total_questions,
        current_index: 4,
        remaining_seconds: 4158,
        status: 'in_progress',
        started_at: sessionStartedAt,
      },
    });

    await prisma.answers.createMany({
      data: activeQuestions.map((question, index) => {
        const answered = index < 4;
        const selectedAnswer = answered ? String((index % 4) + 1) : null;
        const isCorrect = answered
          ? selectedAnswer === question.correct_answer
            ? 1
            : 0
          : null;

        return {
          session_id: session.id,
          question_id: question.id,
          selected_answer: selectedAnswer,
          text_answer: null,
          is_correct: isCorrect,
          spent_seconds: answered ? 11 + index : 0,
          bookmarked: 0,
          updated_at: timestamp(baseTime, 50_000 + index * 1000),
        };
      }),
    });

    console.log('Seed completed.');
    console.log(`Admin login: mock-admin@topik.local / Admin1234!`);
    console.log(`User login: mock-user@topik.local / User1234!`);
    console.log(
      `Active mock exam seeded for ${user.nickname} in session ${session.id}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
