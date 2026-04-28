import { Test, TestingModule } from '@nestjs/testing';
import { QuestionSetsController } from './question-sets.controller';

describe('QuestionSetsController', () => {
  let controller: QuestionSetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionSetsController],
    }).compile();

    controller = module.get<QuestionSetsController>(QuestionSetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
