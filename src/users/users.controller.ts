import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Request as ExpressRequest } from 'express';

type JwtRequest = ExpressRequest & {
  user: {
    userId: string;
    role?: string;
  };
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @Request() req: JwtRequest,
  ): Promise<Record<string, unknown>> {
    try {
      return (await this.usersService.findOne(req.user.userId)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          'User account not found or has been deleted',
        );
      }
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile settings' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Request() req: JwtRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Record<string, unknown>> {
    try {
      return (await this.usersService.update(
        req.user.userId,
        updateUserDto,
      )) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          'User account not found or has been deleted',
        );
      }
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('profile')
  @ApiOperation({ summary: 'Delete current user account (withdrawal)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteProfile(
    @Request() req: JwtRequest,
  ): Promise<Record<string, unknown>> {
    try {
      return (await this.usersService.remove(req.user.userId)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          'User account not found or has already been deleted',
        );
      }
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID (Admin only)' })
  findOne(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.usersService.findOne(id) as Promise<Record<string, unknown>>;
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Record<string, unknown>> {
    return this.usersService.update(id, updateUserDto) as Promise<
      Record<string, unknown>
    >;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string): Promise<Record<string, unknown>> {
    return this.usersService.remove(id) as Promise<Record<string, unknown>>;
  }
}
