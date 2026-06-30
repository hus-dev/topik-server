import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function normalizeMysqlConnectionString(connectionString: string) {
  const url = new URL(connectionString);

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

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    connectionString = normalizeMysqlConnectionString(connectionString);

    super({
      adapter: new PrismaMariaDb(connectionString),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
