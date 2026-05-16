import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type Section = 'reading' | 'listening' | 'writing';

type VideoSeed = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  section: Section;
  level: number;
  is_recommended: number;
  display_order: number;
  question_id?: string | null;
  set_id?: string | null;
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

const sampleVideos = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
];

const sectionLabels: Record<Section, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
};

const sectionDescriptions: Record<Section, string> = {
  reading:
    'Step-by-step explanation for TOPIK II reading question strategy, answer elimination, and passage structure.',
  listening:
    'Step-by-step explanation for TOPIK II listening question strategy, keyword capture, and option selection.',
  writing:
    'Step-by-step explanation for TOPIK II writing structure, sample answer planning, and scoring points.',
};

async function findSectionTargets(section: Section) {
  const question = await prisma.questions.findFirst({
    where: { section },
    orderBy: [{ question_number: 'asc' }, { created_at: 'asc' }],
    select: {
      id: true,
      question_number: true,
      level: true,
      set_id: true,
      question_sets: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
    },
  });

  const questionSet =
    question?.question_sets ??
    (await prisma.question_sets.findFirst({
      where: { section },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
      select: {
        id: true,
        title: true,
        level: true,
      },
    }));

  return { question, questionSet };
}

async function buildSeeds(): Promise<VideoSeed[]> {
  const seeds: VideoSeed[] = [];
  const sections: Section[] = ['reading', 'listening', 'writing'];

  for (const [sectionIndex, section] of sections.entries()) {
    const { question, questionSet } = await findSectionTargets(section);
    const label = sectionLabels[section];
    const level = question?.level ?? questionSet?.level ?? 3;
    const baseOrder = sectionIndex * 10;

    seeds.push({
      id: `video-${section}-recommended`,
      title: `TOPIK II ${label} 핵심 해설`,
      description: sectionDescriptions[section],
      video_url: sampleVideos[sectionIndex % sampleVideos.length],
      thumbnail_url: null,
      section,
      level,
      is_recommended: 1,
      display_order: baseOrder + 1,
      question_id: question?.id ?? null,
      set_id: question ? null : (questionSet?.id ?? null),
    });

    if (questionSet) {
      seeds.push({
        id: `video-${section}-set-overview`,
        title: `${questionSet.title ?? `TOPIK II ${label}`} 전체 해설`,
        description: `${label} set overview explanation for strategy, timing, and common mistakes.`,
        video_url: sampleVideos[(sectionIndex + 1) % sampleVideos.length],
        thumbnail_url: null,
        section,
        level: questionSet.level,
        is_recommended: section === 'writing' ? 1 : 0,
        display_order: baseOrder + 2,
        question_id: null,
        set_id: questionSet.id,
      });
    }

    if (question) {
      seeds.push({
        id: `video-${section}-question-${question.question_number}`,
        title: `${label} Question ${question.question_number} 해설`,
        description: `${label} question ${question.question_number} explanation with answer reasoning and study notes.`,
        video_url: sampleVideos[(sectionIndex + 2) % sampleVideos.length],
        thumbnail_url: null,
        section,
        level,
        is_recommended: 0,
        display_order: baseOrder + 3,
        question_id: question.id,
        set_id: null,
      });
    }
  }

  return seeds.filter((seed) => seed.question_id || seed.set_id);
}

async function importExplanationVideos() {
  const now = BigInt(Date.now());
  const seeds = await buildSeeds();

  await prisma.explanation_videos.deleteMany();

  await prisma.explanation_videos.createMany({
    data: seeds.map((seed) => ({
      id: seed.id,
      title: seed.title,
      description: seed.description,
      thumbnail_url: seed.thumbnail_url,
      video_url: seed.video_url,
      question_id: seed.question_id ?? null,
      set_id: seed.set_id ?? null,
      section: seed.section,
      level: seed.level,
      is_recommended: seed.is_recommended,
      display_order: seed.display_order,
      created_at: now,
      updated_at: now,
    })),
  });

  return seeds.length;
}

async function main() {
  const inserted = await importExplanationVideos();

  console.log('Explanation videos import completed.');
  console.log(JSON.stringify({ inserted }, null, 2));
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
