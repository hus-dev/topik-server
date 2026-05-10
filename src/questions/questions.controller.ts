import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated questions' })
  findAll(@Query() query: GetQuestionsQueryDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question by ID' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }
}
