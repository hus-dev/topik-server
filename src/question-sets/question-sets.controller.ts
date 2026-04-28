import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionSetsService } from './question-sets.service';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';

@ApiTags('question-sets')
@Controller('question-sets')
export class QuestionSetsController {
  constructor(private readonly questionSetsService: QuestionSetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question set' })
  @ApiResponse({ status: 201, description: 'Question set successfully created' })
  create(@Body() createQuestionSetDto: CreateQuestionSetDto) {
    return this.questionSetsService.create(createQuestionSetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all question sets' })
  findAll() {
    return this.questionSetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question set by ID' })
  findOne(@Param('id') id: string) {
    return this.questionSetsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question set' })
  update(
    @Param('id') id: string,
    @Body() updateQuestionSetDto: UpdateQuestionSetDto,
  ) {
    return this.questionSetsService.update(id, updateQuestionSetDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question set' })
  remove(@Param('id') id: string) {
    return this.questionSetsService.remove(id);
  }
}
