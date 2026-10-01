import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiExampleService } from './ai-example.service';
import { RedisService } from '../redis/redis.service';

describe('AiExampleService', () => {
  let service: AiExampleService;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiExampleService,
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiExampleService>(AiExampleService);
  });

  it('should return cached result from Redis if available', async () => {
    const cachedResponse = {
      korean: '매일 아침 한국어 단어를 열심히 공부해요.',
      translation: 'I study Korean words diligently every morning.',
      contextTag: '일상 대화',
    };
    redisService.get.mockResolvedValue(JSON.stringify(cachedResponse));

    const result = await service.generateExample({
      word: '공부하다',
      meaning: 'to study',
      targetLang: 'en',
      index: 0,
    });

    expect(result).toEqual(cachedResponse);
    expect(redisService.get).toHaveBeenCalledWith(
      'ai:voca:example:%EA%B3%B5%EB%B6%80%ED%95%98%EB%8B%A4:0:en',
    );
  });

  it('should return structured fallback when GEMINI_API_KEY is not configured', async () => {
    redisService.get.mockResolvedValue(null);
    configService.get.mockReturnValue(undefined);

    const result = await service.generateExample({
      word: '노력하다',
      meaning: 'to make an effort',
      targetLang: 'uz',
      index: 0,
    });

    expect(result).toBeDefined();
    expect(result.korean).toContain('노력');
    expect(result.contextTag).toBe('일상 대화');
  });

  it('should call Gemini API when GEMINI_API_KEY is present and save to Redis', async () => {
    redisService.get.mockResolvedValue(null);
    configService.get.mockImplementation((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'fake-test-key';
      if (key === 'GEMINI_MODEL') return 'gemini-2.0-flash';
      return undefined;
    });

    const mockAiResponse = {
      korean: '목표를 달성하기 위해 밤낮으로 열심히 노력했습니다.',
      translation: 'Maqsadga erishish uchun kechayu kunduz qattiq harakat qildim.',
      contextTag: '일상 대화',
    };

    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockAiResponse) }],
            },
          },
        ],
      }),
    } as unknown as Response);

    try {
      const result = await service.generateExample({
        word: '노력하다',
        meaning: 'harakat qilmoq',
        targetLang: 'uz',
        index: 0,
      });

      expect(result).toEqual(mockAiResponse);
      expect(redisService.set).toHaveBeenCalledWith(
        'ai:voca:example:%EB%85%B8%EB%A0%A5%ED%95%98%EB%8B%A4:0:uz',
        JSON.stringify(mockAiResponse),
        2592000,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should gracefully fallback if Gemini API call fails', async () => {
    redisService.get.mockResolvedValue(null);
    configService.get.mockImplementation((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'fake-test-key';
      return undefined;
    });

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    try {
      const result = await service.generateExample({
        word: '사과',
        meaning: 'apple',
        targetLang: 'en',
        index: 1,
      });

      expect(result).toBeDefined();
      expect(result.korean).toContain('사과');
      expect(result.contextTag).toBe('TOPIK 실전');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
