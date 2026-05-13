import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { OfflineService } from '../offline/offline.service';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
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
