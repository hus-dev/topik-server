import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QuestionsAiExplanationService } from './questions-ai-explanation.service';

describe('QuestionsAiExplanationService', () => {
  let service: QuestionsAiExplanationService;
  let prisma: any;
  let redis: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      questions: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      question_ai_explanations: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
        if (key === 'GEMINI_MODEL') return 'gemini-2.0-flash';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsAiExplanationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<QuestionsAiExplanationService>(
      QuestionsAiExplanationService,
    );
  });

  it('should return cached result from Redis if available', async () => {
    const cachedData = {
      questionId: 'q-1',
      selectedOption: '2',
      correctAnswer: '3',
      isCorrect: false,
      languageCode: 'uz',
      explanation: {
        wrongReason: 'Noto‘g‘ri',
        correctReason: 'To‘g‘ri',
        keyVocabulary: [],
        tip: 'Diqqat qiling',
      },
      rawExplanationText: 'Cached explanation',
      source: 'cache',
    };

    redis.get.mockResolvedValue(JSON.stringify(cachedData));
    prisma.questions.findUnique.mockResolvedValue({
      id: 'q-1',
      correct_answer: '3',
      prompt: '다음 글을 읽고 맞지 않는 것을 고르십시오.',
      question_options: [],
    });

    const result = await service.explainQuestion('q-1', {
      selectedOption: '2',
      languageCode: 'uz',
    });

    expect(result.source).toBe('cache');
    expect(result.selectedOption).toBe('2');
    expect(result.correctAnswer).toBe('3');
    expect(result.isCorrect).toBe(false);
  });

  it('should return DB record if Redis missed but DB hit', async () => {
    redis.get.mockResolvedValue(null);
    prisma.questions.findUnique.mockResolvedValue({
      id: 'q-2',
      correct_answer: '4',
      prompt: '빈칸에 들어갈 말을 고르십시오.',
      question_options: [],
    });

    prisma.question_ai_explanations.findUnique.mockResolvedValue({
      id: 'exp-1',
      question_id: 'q-2',
      selected_option: '1',
      language_code: 'uz',
      explanation: JSON.stringify({
        wrongReason: '1-variant xato',
        correctReason: '4-variant to‘g‘ri',
        keyVocabulary: [{ korean: '단어', translation: 'so‘z' }],
        tip: 'Qoidani yodlang',
      }),
      created_at: BigInt(123456789),
    });

    const result = await service.explainQuestion('q-2', {
      selectedOption: '1',
      languageCode: 'uz',
    });

    expect(result.source).toBe('db');
    expect(result.isCorrect).toBe(false);
    expect(result.explanation.wrongReason).toBe('1-variant xato');
    expect(redis.set).toHaveBeenCalled();
  });

  it('should return fallback if Gemini key is missing or call fails', async () => {
    redis.get.mockResolvedValue(null);
    prisma.question_ai_explanations.findUnique.mockResolvedValue(null);
    configService.get.mockReturnValue(null); // No API key

    prisma.questions.findUnique.mockResolvedValue({
      id: 'q-3',
      correct_answer: '2',
      explanation: '기본 해설입니다.',
      prompt: '문제를 읽으세요.',
      question_options: [
        { option_number: 1, content: '선지 1' },
        { option_number: 2, content: '선지 2' },
      ],
    });

    const result = await service.explainQuestion('q-3', {
      selectedOption: '1',
      languageCode: 'uz',
    });

    expect(result.source).toBe('fallback');
    expect(result.isCorrect).toBe(false);
    expect(result.correctAnswer).toBe('2');
    expect(result.rawExplanationText).toContain('오답인 이유');
  });
});
