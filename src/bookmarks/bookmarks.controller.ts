import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { BookmarksService } from './bookmarks.service';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('bookmarks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get bookmark counts' })
  getSummary(@Request() req: JwtRequest) {
    return this.bookmarksService.getSummary(req.user.userId);
  }

  @Get('questions')
  @ApiOperation({ summary: 'Get bookmarked questions' })
  getQuestions(@Request() req: JwtRequest) {
    return this.bookmarksService.getQuestions(req.user.userId);
  }

  @Patch('questions/:questionId')
  @ApiOperation({ summary: 'Toggle a question bookmark' })
  updateQuestion(
    @Request() req: JwtRequest,
    @Param('questionId') questionId: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.updateQuestion(
      req.user.userId,
      questionId,
      updateBookmarkDto.bookmarked,
    );
  }

  @Get('vocabulary')
  @ApiOperation({ summary: 'Get bookmarked vocabulary' })
  getVocabulary(@Request() req: JwtRequest) {
    return this.bookmarksService.getVocabulary(req.user.userId);
  }

  @Patch('vocabulary/:vocabularyId')
  @ApiOperation({ summary: 'Toggle a vocabulary bookmark' })
  updateVocabulary(
    @Request() req: JwtRequest,
    @Param('vocabularyId') vocabularyId: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.updateVocabulary(
      req.user.userId,
      vocabularyId,
      updateBookmarkDto.bookmarked,
    );
  }

  @Get('grammar')
  @ApiOperation({ summary: 'Get bookmarked grammar items' })
  getGrammar(@Request() req: JwtRequest) {
    return this.bookmarksService.getGrammar(req.user.userId);
  }

  @Patch('grammar/:grammarId')
  @ApiOperation({ summary: 'Toggle a grammar bookmark' })
  updateGrammar(
    @Request() req: JwtRequest,
    @Param('grammarId') grammarId: string,
    @Body() updateBookmarkDto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.updateGrammar(
      req.user.userId,
      grammarId,
      updateBookmarkDto.bookmarked,
    );
  }
}
