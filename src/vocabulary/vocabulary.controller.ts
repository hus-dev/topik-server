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
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { GetVocabularyQueryDto } from './dto/get-vocabulary-query.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('vocabulary')
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Get()
  @ApiOperation({ summary: 'Get vocabulary list' })
  findAll(@Query() query: GetVocabularyQueryDto) {
    return this.vocabularyService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vocabulary by ID' })
  findOne(@Param('id') id: string) {
    return this.vocabularyService.findOne(id);
  }

  @Patch(':id/bookmark')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark vocabulary' })
  bookmark(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.vocabularyService.setBookmark(req.user.userId, id, true);
  }

  @Post(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark vocabulary as downloaded' })
  download(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.vocabularyService.setDownloaded(req.user.userId, id, true);
  }

  @Delete(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove vocabulary download marker' })
  removeDownload(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.vocabularyService.setDownloaded(req.user.userId, id, false);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create vocabulary item' })
  create(@Body() createVocabularyDto: CreateVocabularyDto) {
    return this.vocabularyService.create(createVocabularyDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vocabulary item' })
  update(
    @Param('id') id: string,
    @Body() updateVocabularyDto: UpdateVocabularyDto,
  ) {
    return this.vocabularyService.update(id, updateVocabularyDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete vocabulary item' })
  remove(@Param('id') id: string) {
    return this.vocabularyService.remove(id);
  }
}
