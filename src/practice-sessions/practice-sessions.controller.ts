import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { SavePracticeAnswerDto } from './dto/save-practice-answer.dto';
import { UpdatePracticeProgressDto } from './dto/update-practice-progress.dto';
import { PracticeSessionsService } from './practice-sessions.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('practice-sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('practice-sessions')
export class PracticeSessionsController {
  constructor(
    private readonly practiceSessionsService: PracticeSessionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a practice session' })
  @ApiResponse({ status: 201, description: 'Practice session created' })
  create(
    @Request() req: JwtRequest,
    @Body() createPracticeSessionDto: CreatePracticeSessionDto,
  ) {
    return this.practiceSessionsService.create(
      req.user.userId,
      createPracticeSessionDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a practice session' })
  findOne(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.practiceSessionsService.findOne(req.user.userId, id);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update practice session progress' })
  updateProgress(
    @Request() req: JwtRequest,
    @Param('id') id: string,
    @Body() updatePracticeProgressDto: UpdatePracticeProgressDto,
  ) {
    return this.practiceSessionsService.updateProgress(
      req.user.userId,
      id,
      updatePracticeProgressDto,
    );
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Save an answer for a practice session' })
  saveAnswer(
    @Request() req: JwtRequest,
    @Param('id') id: string,
    @Body() savePracticeAnswerDto: SavePracticeAnswerDto,
  ) {
    return this.practiceSessionsService.saveAnswer(
      req.user.userId,
      id,
      savePracticeAnswerDto,
    );
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a practice session' })
  submit(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.practiceSessionsService.submit(req.user.userId, id);
  }

  @Get(':id/result')
  @ApiOperation({ summary: 'Get practice session result' })
  getResult(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.practiceSessionsService.getResult(req.user.userId, id);
  }
}
