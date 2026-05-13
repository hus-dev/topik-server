import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateTopikExamScheduleDto } from './dto/create-topik-exam-schedule.dto';
import { UpdateTopikExamScheduleDto } from './dto/update-topik-exam-schedule.dto';
import { TopikExamSchedulesService } from './topik-exam-schedules.service';

@ApiTags('topik-exam-schedules')
@Controller('topik-exam-schedules')
export class TopikExamSchedulesController {
  constructor(
    private readonly topikExamSchedulesService: TopikExamSchedulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get TOPIK exam schedules' })
  findAll() {
    return this.topikExamSchedulesService.findAll();
  }

  @Get('next')
  @ApiOperation({ summary: 'Get next TOPIK exam schedule' })
  findNext() {
    return this.topikExamSchedulesService.findNext();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a TOPIK exam schedule' })
  create(@Body() createDto: CreateTopikExamScheduleDto) {
    return this.topikExamSchedulesService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a TOPIK exam schedule' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTopikExamScheduleDto,
  ) {
    return this.topikExamSchedulesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a TOPIK exam schedule' })
  remove(@Param('id') id: string) {
    return this.topikExamSchedulesService.remove(id);
  }
}
