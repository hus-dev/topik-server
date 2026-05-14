import { PartialType } from '@nestjs/swagger';
import { CreateExplanationVideoDto } from './create-explanation-video.dto';

export class UpdateExplanationVideoDto extends PartialType(
  CreateExplanationVideoDto,
) {}
