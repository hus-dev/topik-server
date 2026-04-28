import { PartialType } from '@nestjs/swagger';
import { CreateQuestionSetDto } from './create-question-set.dto';

export class UpdateQuestionSetDto extends PartialType(CreateQuestionSetDto) {}
