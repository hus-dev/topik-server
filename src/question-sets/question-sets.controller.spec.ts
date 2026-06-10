import { Test, TestingModule } from '@nestjs/testing';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSetsService } from './question-sets.service';

describe('QuestionSetsController', () => {
  let controller: QuestionSetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionSetsController],
      providers: [
        {
          provide: QuestionSetsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<QuestionSetsController>(QuestionSetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
