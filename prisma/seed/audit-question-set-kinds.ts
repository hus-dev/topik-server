import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const EXAM_KIND = {
  MOCK: 'mock',
  PRACTICE: 'practice',
  TYPE: 'type',
} as const;

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

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

type Finding = {
  severity: 'error' | 'warning';
  message: string;
  details?: unknown;
};

function isPracticeSet(id: string, title: string | null) {
  return (
    id.startsWith('practice-') ||
    title?.toLowerCase().includes('practice') ||
    false
  );
}

function isTopik102MockSet(id: string) {
  return id === 'topik2-102-reading' || id === 'topik2-102-listening';
}

async function main() {
  const findings: Finding[] = [];

  const sets = await prisma.question_sets.findMany({
    orderBy: [{ exam_kind: 'asc' }, { section: 'asc' }, { level: 'asc' }],
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  for (const set of sets) {
    if (
      isPracticeSet(set.id, set.title) &&
      set.exam_kind !== EXAM_KIND.PRACTICE
    ) {
      findings.push({
        severity: 'error',
        message: 'Practice set has wrong exam_kind',
        details: {
          id: set.id,
          title: set.title,
          exam_kind: set.exam_kind,
        },
      });
    }

    if (isTopik102MockSet(set.id) && set.exam_kind !== EXAM_KIND.MOCK) {
      findings.push({
        severity: 'error',
        message: 'TOPIK 102 mock set has wrong exam_kind',
        details: {
          id: set.id,
          title: set.title,
          exam_kind: set.exam_kind,
        },
      });
    }

    if (
      set.total_questions > 0 &&
      set.total_questions !== set._count.questions
    ) {
      findings.push({
        severity: 'warning',
        message:
          'question_sets.total_questions does not match actual question count',
        details: {
          id: set.id,
          title: set.title,
          total_questions: set.total_questions,
          actual_questions: set._count.questions,
        },
      });
    }
  }

  const practiceReadingLevel4Count = await prisma.questions.count({
    where: {
      section: 'reading',
      level: 4,
      question_sets: {
        exam_kind: EXAM_KIND.PRACTICE,
      },
    },
  });
  const mockReadingLevel4Count = await prisma.questions.count({
    where: {
      section: 'reading',
      level: 4,
      question_sets: {
        exam_kind: EXAM_KIND.MOCK,
      },
    },
  });
  const practiceReadingLevel4SetIds = await prisma.questions.groupBy({
    by: ['set_id'],
    where: {
      section: 'reading',
      level: 4,
      question_sets: {
        exam_kind: EXAM_KIND.PRACTICE,
      },
    },
    _count: {
      _all: true,
    },
  });

  if (practiceReadingLevel4Count !== 30) {
    findings.push({
      severity: 'error',
      message: 'Reading level 4 practice question count must be 30',
      details: {
        count: practiceReadingLevel4Count,
        groups: practiceReadingLevel4SetIds,
      },
    });
  }

  if (mockReadingLevel4Count < 50) {
    findings.push({
      severity: 'warning',
      message: 'Reading level 4 mock question count is lower than expected',
      details: {
        count: mockReadingLevel4Count,
      },
    });
  }

  const summary = {
    status: findings.some((finding) => finding.severity === 'error')
      ? 'failed'
      : 'passed',
    set_count: sets.length,
    practice_reading_level4_count: practiceReadingLevel4Count,
    mock_reading_level4_count: mockReadingLevel4Count,
    findings,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status === 'failed') {
    process.exitCode = 1;
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
