import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function normalizeMariaDbConnectionString(connectionString: string) {
  const url = new URL(connectionString);

  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    connectionString = normalizeMariaDbConnectionString(connectionString);

    // Prisma v7 requires adapter/accelerateUrl in PrismaClientOptions.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      adapter: new PrismaMariaDb(connectionString),
    });
  }

  async onModuleInit() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.$connect();
  }
}
