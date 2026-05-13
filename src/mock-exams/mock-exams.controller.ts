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
import { CreateMockExamSessionDto } from './dto/create-mock-exam-session.dto';
import { SaveMockExamAnswerDto } from './dto/save-mock-exam-answer.dto';
import { UpdateMockExamProgressDto } from './dto/update-mock-exam-progress.dto';
import { MockExamsService } from './mock-exams.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('mock-exams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('mock-exams')
export class MockExamsController {
  constructor(private readonly mockExamsService: MockExamsService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a mock exam session' })
  @ApiResponse({ status: 201, description: 'Mock exam session created' })
  create(
    @Request() req: JwtRequest,
    @Body() createMockExamSessionDto: CreateMockExamSessionDto,
  ) {
    return this.mockExamsService.create(
      req.user.userId,
      createMockExamSessionDto,
    );
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active mock exam session' })
  getActive(@Request() req: JwtRequest) {
    return this.mockExamsService.getActive(req.user.userId);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Get mock exam catalog' })
  getCatalog(@Request() req: JwtRequest) {
    return this.mockExamsService.getCatalog(req.user.userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a mock exam session' })
  findOne(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.mockExamsService.findOne(req.user.userId, id);
  }

  @Patch('sessions/:id/progress')
  @ApiOperation({ summary: 'Update mock exam session progress' })
  updateProgress(
    @Request() req: JwtRequest,
    @Param('id') id: string,
    @Body() updateMockExamProgressDto: UpdateMockExamProgressDto,
  ) {
    return this.mockExamsService.updateProgress(
      req.user.userId,
      id,
      updateMockExamProgressDto,
    );
  }

  @Post('sessions/:id/answers')
  @ApiOperation({ summary: 'Save an answer for a mock exam session' })
  saveAnswer(
    @Request() req: JwtRequest,
    @Param('id') id: string,
    @Body() saveMockExamAnswerDto: SaveMockExamAnswerDto,
  ) {
    return this.mockExamsService.saveAnswer(
      req.user.userId,
      id,
      saveMockExamAnswerDto,
    );
  }

  @Post('sessions/:id/submit')
  @ApiOperation({ summary: 'Submit a mock exam session' })
  submit(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.mockExamsService.submit(req.user.userId, id);
  }

  @Get('sessions/:id/result')
  @ApiOperation({ summary: 'Get mock exam session result' })
  getResult(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.mockExamsService.getResult(req.user.userId, id);
  }
}
