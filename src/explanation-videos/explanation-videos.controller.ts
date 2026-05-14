import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateExplanationVideoDto } from './dto/create-explanation-video.dto';
import { GetExplanationVideosQueryDto } from './dto/get-explanation-videos.query';
import { ExplanationVideosService } from './explanation-videos.service';

@ApiTags('explanation-videos')
@Controller('explanation-videos')
export class ExplanationVideosController {
  constructor(
    private readonly explanationVideosService: ExplanationVideosService,
  ) {}

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended explanation videos' })
  findRecommended() {
    return this.explanationVideosService.findRecommended();
  }

  @Get()
  @ApiOperation({ summary: 'Get explanation videos' })
  findAll(@Query() query: GetExplanationVideosQueryDto) {
    return this.explanationVideosService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an explanation video by ID' })
  findOne(@Param('id') id: string) {
    return this.explanationVideosService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an explanation video' })
  create(@Body() createDto: CreateExplanationVideoDto) {
    return this.explanationVideosService.create(createDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an explanation video' })
  remove(@Param('id') id: string) {
    return this.explanationVideosService.remove(id);
  }
}
