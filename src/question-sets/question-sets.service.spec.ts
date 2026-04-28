import { Test, TestingModule } from '@nestjs/testing';
import { QuestionSetsService } from './question-sets.service';

describe('QuestionSetsService', () => {
  let service: QuestionSetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionSetsService],
    }).compile();

    service = module.get<QuestionSetsService>(QuestionSetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
