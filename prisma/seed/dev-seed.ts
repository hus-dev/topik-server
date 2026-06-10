import 'dotenv/config';
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

const demoSetTitles = [
  'DEV TOPIK II Reading Set',
  'DEV TOPIK II Listening Set',
  'DEV TOPIK II Writing Set',
];

async function clearDemoQuestionSets() {
  const sets = await prisma.question_sets.findMany({
    where: {
      title: {
        in: demoSetTitles,
      },
    },
    select: { id: true },
  });

  const setIds = sets.map((set) => set.id);
  if (setIds.length === 0) return;

  const questions = await prisma.questions.findMany({
    where: {
      set_id: {
        in: setIds,
      },
    },
    select: { id: true },
  });
  const questionIds = questions.map((question) => question.id);

  if (questionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: {
        question_id: {
          in: questionIds,
        },
      },
    });
    await prisma.question_options.deleteMany({
      where: {
        question_id: {
          in: questionIds,
        },
      },
    });
    await prisma.question_media.deleteMany({
      where: {
        question_id: {
          in: questionIds,
        },
      },
    });
    await prisma.questions.deleteMany({
      where: {
        id: {
          in: questionIds,
        },
      },
    });
  }

  await prisma.exam_sessions.deleteMany({
    where: {
      set_id: {
        in: setIds,
      },
    },
  });
  await prisma.question_sets.deleteMany({
    where: {
      id: {
        in: setIds,
      },
    },
  });
}

async function createQuestionSet(input: {
  title: string;
  section: string;
  level: number;
}) {
  const timestamp = now();
  return prisma.question_sets.create({
    data: {
      title: input.title,
      section: input.section,
      level: input.level,
      exam_kind: 'practice',
      created_at: timestamp,
      updated_at: timestamp,
    },
  });
}

async function createQuestion(input: {
  set_id: string;
  section: string;
  question_number: number;
  level: number;
  prompt: string;
  correct_answer: string;
  explanation: string;
  options: string[];
  media?: {
    media_type: string;
    url: string;
    duration_seconds?: number;
    transcript?: string;
  };
}) {
  const timestamp = now();
  return prisma.questions.create({
    data: {
      set_id: input.set_id,
      section: input.section,
      question_type: 'multiple_choice',
      question_number: input.question_number,
      level: input.level,
      prompt: input.prompt,
      correct_answer: input.correct_answer,
      explanation: input.explanation,
      difficulty: 2,
      time_limit_seconds: 60,
      is_ai_generated: 0,
      is_downloaded: 0,
      created_at: timestamp,
      updated_at: timestamp,
      question_options: {
        create: input.options.map((content, index) => ({
          option_number: index + 1,
          content,
          is_correct: String(index + 1) === input.correct_answer ? 1 : 0,
        })),
      },
      question_media: input.media
        ? {
            create: {
              media_type: input.media.media_type,
              url: input.media.url,
              duration_seconds: input.media.duration_seconds,
              transcript: input.media.transcript,
              sort_order: 1,
              created_at: timestamp,
              updated_at: timestamp,
            },
          }
        : undefined,
    },
  });
}

async function seedQuestions() {
  await clearDemoQuestionSets();

  const readingSet = await createQuestionSet({
    title: 'DEV TOPIK II Reading Set',
    section: 'reading',
    level: 3,
  });
  const listeningSet = await createQuestionSet({
    title: 'DEV TOPIK II Listening Set',
    section: 'listening',
    level: 3,
  });
  const writingSet = await createQuestionSet({
    title: 'DEV TOPIK II Writing Set',
    section: 'writing',
    level: 4,
  });

  const readingPrompts = [
    '다음 글의 중심 생각으로 알맞은 것을 고르십시오.',
    '밑줄 친 부분과 의미가 비슷한 것을 고르십시오.',
    '다음 글을 읽고 내용과 같은 것을 고르십시오.',
    '다음 글의 순서로 가장 알맞은 것을 고르십시오.',
    '다음 글을 읽고 빈칸에 들어갈 말로 알맞은 것을 고르십시오.',
  ];

  for (const [index, prompt] of readingPrompts.entries()) {
    await createQuestion({
      set_id: readingSet.id,
      section: 'reading',
      question_number: index + 1,
      level: 3,
      prompt,
      correct_answer: '1',
      explanation: '개발용 샘플 문제입니다. 1번을 정답으로 설정했습니다.',
      options: [
        '정답 보기',
        '비슷하지만 문맥과 맞지 않는 보기',
        '주제와 관련 없는 보기',
        '세부 내용을 과장한 보기',
      ],
    });
  }

  for (let index = 0; index < 5; index += 1) {
    await createQuestion({
      set_id: listeningSet.id,
      section: 'listening',
      question_number: index + 1,
      level: 3,
      prompt: `다음을 듣고 알맞은 대답을 고르십시오. (${index + 1})`,
      correct_answer: '2',
      explanation: '개발용 듣기 샘플입니다. 2번을 정답으로 설정했습니다.',
      options: [
        '아니요, 아직 안 했어요.',
        '네, 지금 하고 있어요.',
        '어제 도서관에 갔어요.',
        '주말에는 쉬고 싶어요.',
      ],
      media: {
        media_type: 'audio',
        url: `https://example.com/dev-listening-${index + 1}.mp3`,
        duration_seconds: 45,
        transcript: 'A: 지금 숙제를 하고 있어요? B: 네, 지금 하고 있어요.',
      },
    });
  }

  for (let index = 0; index < 3; index += 1) {
    await createQuestion({
      set_id: writingSet.id,
      section: 'writing',
      question_number: index + 1,
      level: 4,
      prompt: `다음 주제에 대해 글을 쓰기 전에 알맞은 구성을 고르십시오. (${index + 1})`,
      correct_answer: '3',
      explanation: '개발용 쓰기 샘플입니다. 3번을 정답으로 설정했습니다.',
      options: [
        '결론만 제시한다.',
        '예시 없이 주장만 반복한다.',
        '주장, 근거, 예시, 결론을 포함한다.',
        '관련 없는 경험을 중심으로 쓴다.',
      ],
    });
  }
}

async function seedVocabulary() {
  const items = [
    ['학교', 'school', 'school', 3],
    ['도서관', 'library', 'library', 3],
    ['경험', 'experience', 'experience', 4],
    ['의견', 'opinion', 'opinion', 4],
    ['환경', 'environment', 'environment', 5],
    ['발전', 'development', 'development', 5],
    ['문화', 'culture', 'culture', 3],
    ['경제', 'economy', 'economy', 5],
    ['사회', 'society', 'society', 4],
    ['문제점', 'problem', 'problem', 4],
  ] as const;

  for (const [word, meaning_ko, meaning_user_lang, level] of items) {
    const existing = await prisma.vocabulary.findFirst({
      where: { word, level },
      select: { id: true },
    });

    if (existing) {
      await prisma.vocabulary.update({
        where: { id: existing.id },
        data: {
          meaning_ko,
          meaning_user_lang,
          updated_at: now(),
        },
      });
      continue;
    }

    await prisma.vocabulary.create({
      data: {
        word,
        meaning_ko,
        meaning_user_lang,
        level,
        tts_url: `https://example.com/tts/${encodeURIComponent(word)}.mp3`,
        is_downloaded: 0,
        updated_at: now(),
      },
    });
  }
}

async function seedGrammar() {
  const items = [
    {
      pattern: '-고 있다',
      description: 'Used to express an action currently in progress.',
      examples_json: [
        { ko: '한국어를 공부하고 있어요.', en: 'I am studying Korean.' },
      ],
      tags_json: ['progressive', 'TOPIK'],
    },
    {
      pattern: '-기 때문에',
      description: 'Used to express a reason or cause.',
      examples_json: [
        {
          ko: '비가 오기 때문에 집에 있어요.',
          en: 'Because it is raining, I stay home.',
        },
      ],
      tags_json: ['reason', 'TOPIK II'],
    },
    {
      pattern: '-아/어도',
      description: 'Used to express concession.',
      examples_json: [
        { ko: '바빠도 운동을 해요.', en: 'Even if I am busy, I exercise.' },
      ],
      tags_json: ['concession', 'TOPIK II'],
    },
    {
      pattern: '-는 대신에',
      description: 'Used to express replacement or compensation.',
      examples_json: [
        {
          ko: '커피를 마시는 대신에 차를 마셔요.',
          en: 'Instead of coffee, I drink tea.',
        },
      ],
      tags_json: ['replacement', 'TOPIK II'],
    },
    {
      pattern: '-도록',
      description: 'Used to express purpose or result.',
      examples_json: [
        {
          ko: '잘 들리도록 크게 말해 주세요.',
          en: 'Please speak loudly so it can be heard well.',
        },
      ],
      tags_json: ['purpose', 'TOPIK II'],
    },
  ];

  for (const item of items) {
    const existing = await prisma.grammar_items.findFirst({
      where: { pattern: item.pattern },
      select: { id: true },
    });

    if (existing) {
      await prisma.grammar_items.update({
        where: { id: existing.id },
        data: {
          description: item.description,
          examples_json: item.examples_json,
          tags_json: item.tags_json,
          updated_at: now(),
        },
      });
      continue;
    }

    await prisma.grammar_items.create({
      data: {
        ...item,
        is_downloaded: 0,
        updated_at: now(),
      },
    });
  }
}

async function main() {
  await seedQuestions();
  await seedVocabulary();
  await seedGrammar();
}

main()
  .then(async () => {
    console.log('Development seed completed.');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
