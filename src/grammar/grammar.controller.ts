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
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { GetGrammarQueryDto } from './dto/get-grammar-query.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { GrammarService } from './grammar.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('grammar')
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Get()
  @ApiOperation({ summary: 'Get grammar list' })
  findAll(@Query() query: GetGrammarQueryDto) {
    return this.grammarService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get grammar item by ID' })
  findOne(@Param('id') id: string) {
    return this.grammarService.findOne(id);
  }

  @Patch(':id/bookmark')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark grammar item' })
  bookmark(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.grammarService.setBookmark(req.user.userId, id, true);
  }

  @Post(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark grammar item as downloaded' })
  download(@Param('id') id: string) {
    return this.grammarService.setDownloaded(id, true);
  }

  @Delete(':id/download')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove grammar download marker' })
  removeDownload(@Param('id') id: string) {
    return this.grammarService.setDownloaded(id, false);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create grammar item' })
  create(@Body() createGrammarDto: CreateGrammarDto) {
    return this.grammarService.create(createGrammarDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update grammar item' })
  update(@Param('id') id: string, @Body() updateGrammarDto: UpdateGrammarDto) {
    return this.grammarService.update(id, updateGrammarDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete grammar item' })
  remove(@Param('id') id: string) {
    return this.grammarService.remove(id);
  }
}
