import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OfflineService } from '../offline/offline.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { GetAiExplanationDto } from './dto/get-ai-explanation.dto';
import { GetAiWritingFeedbackDto } from './dto/get-ai-writing-feedback.dto';
import { QuestionsService } from './questions.service';

import { QuestionsAiExplanationService } from './questions-ai-explanation.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly offlineService: OfflineService,
    private readonly aiExplanationService: QuestionsAiExplanationService,
  ) {}

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

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a question' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question' })
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }

  @Post(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark question as downloaded' })
  download(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.offlineService.setDownloadStatus(
      req.user.userId,
      'question',
      id,
      true,
    );
  }

  @Delete(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove question download marker' })
  removeDownload(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.offlineService.setDownloadStatus(
      req.user.userId,
      'question',
      id,
      false,
    );
  }

  @Post(':id/ai-explanation')
  @ApiOperation({
    summary: 'Generate or retrieve 1:1 tailored AI explanation for student answer',
  })
  getAiExplanation(
    @Param('id') id: string,
    @Body() dto: GetAiExplanationDto,
  ) {
    return this.aiExplanationService.explainQuestion(id, dto);
  }

  @Post(':id/ai-writing-feedback')
  @ApiOperation({
    summary: 'Generate 1:1 tailored AI feedback & correction for student writing answer',
  })
  getAiWritingFeedback(
    @Param('id') id: string,
    @Body() dto: GetAiWritingFeedbackDto,
  ) {
    return this.aiExplanationService.provideWritingFeedback(id, dto);
  }
}


