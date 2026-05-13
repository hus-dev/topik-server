import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
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

async function main() {
  const items = await prisma.vocabulary.findMany({
    orderBy: [{ level: 'asc' }, { word: 'asc' }],
    select: {
      word: true,
      meaning_ko: true,
      meaning_user_lang: true,
      level: true,
      tts_url: true,
    },
  });

  const output = {
    title: 'TOPIK II Vocabulary 1000',
    section: 'vocabulary',
    total: items.length,
    levels: [1, 2, 3, 4, 5, 6],
    items,
  };

  const outputDir = join(process.cwd(), 'content');
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, 'topik2-vocabulary-1000.json');
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`Vocabulary JSON exported: ${outputPath}`);
  console.log(`Total vocabulary items: ${items.length}`);
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
