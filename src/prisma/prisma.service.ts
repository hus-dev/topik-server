import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    // The MariaDB adapter requires the connection string to start with 'mariadb://'
    if (connectionString.startsWith('mysql://')) {
      connectionString = connectionString.replace('mysql://', 'mariadb://');
    }

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
