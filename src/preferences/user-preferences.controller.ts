import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { PreferencesMergerService } from './preferences-merger.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ResponseUtil } from 'src/shared/utils/response.util';
import { BaseResponse } from 'src/shared/types/base-response.types';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('users/preferences')
export class UserPreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
    private readonly merger: PreferencesMergerService,
  ) {}

  @ApiOperation({ summary: 'Get current user long-term preferences (master)' })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  @Get()
  async getMine(@Req() req: RequestWithUser): Promise<BaseResponse<any>> {
    const prefs = await this.preferencesService.getUserPreferences(req.user.id);
    return ResponseUtil.success(prefs ?? {});
  }

  @ApiOperation({
    summary: 'Update current user long-term preferences (master)',
  })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiBody({
    description: 'User long-term preferences to persist in Settings',
    type: UpdateUserPreferencesDto,
    examples: {
      minimal: {
        summary: 'Minimal update',
        value: {
          interests: ['food', 'nature'],
        },
      },
      full: {
        summary: 'Full preferences',
        value: {
          travelStyle: ['adventure', 'cultural'],
          budgetRange: { min: 300, max: 1200, currency: 'USD' },
          interests: ['food', 'history', 'nightlife'],
          dietaryRestrictions: ['vegetarian', 'no-peanuts'],
          accessibilityNeeds: ['wheelchair-accessible'],
        },
      },
    },
  })
  @Patch()
  async updateMine(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateUserPreferencesDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.preferencesService.upsertUserPreferences(
      req.user.id,
      dto,
    );
    return ResponseUtil.success(updated);
  }
}
