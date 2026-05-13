import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { GetOfflineItemsQueryDto } from './dto/get-offline-items.query';
import { SyncOfflineDto } from './dto/sync-offline.dto';
import { OfflineService } from './offline.service';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('offline')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('offline')
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get offline download summary' })
  getSummary(@Request() req: JwtRequest) {
    return this.offlineService.getSummary(req.user.userId);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get offline download items' })
  getItems(
    @Request() req: JwtRequest,
    @Query() query: GetOfflineItemsQueryDto,
  ) {
    return this.offlineService.getItems(req.user.userId, query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync offline items' })
  sync(@Request() req: JwtRequest, @Body() syncOfflineDto: SyncOfflineDto) {
    return this.offlineService.sync(req.user.userId, syncOfflineDto);
  }

  @Get('sync/status')
  @ApiOperation({ summary: 'Get offline sync status' })
  getSyncStatus(@Request() req: JwtRequest) {
    return this.offlineService.getSyncStatus(req.user.userId);
  }
}
