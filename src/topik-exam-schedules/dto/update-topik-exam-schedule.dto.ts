import { PartialType } from '@nestjs/swagger';
import { CreateTopikExamScheduleDto } from './create-topik-exam-schedule.dto';

export class UpdateTopikExamScheduleDto extends PartialType(
  CreateTopikExamScheduleDto,
) {}
