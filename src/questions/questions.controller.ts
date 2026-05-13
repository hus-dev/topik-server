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
import { QuestionsService } from './questions.service';

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
}
