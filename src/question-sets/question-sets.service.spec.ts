import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QuestionSetsService } from './question-sets.service';

describe('QuestionSetsService', () => {
  let service: QuestionSetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionSetsService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: RedisService,
          useValue: {
            getOrSet: jest.fn((key, fn) => fn()),
            del: jest.fn(),
            invalidatePattern: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuestionSetsService>(QuestionSetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
