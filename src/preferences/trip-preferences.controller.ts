import { Controller, Get, Patch, Body, Req, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdateTripPreferencesDto } from './dto/update-trip-preferences.dto';
import { ResponseUtil } from 'src/shared/utils/response.util';
import { BaseResponse } from 'src/shared/types/base-response.types';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('trips/:tripId/preferences')
export class TripPreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @ApiOperation({ summary: 'Get preferences for a specific trip' })
  @ApiResponse({
    status: 200,
    description: 'Trip preferences retrieved successfully',
  })
  @Get()
  async getTripPrefs(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
  ): Promise<BaseResponse<any>> {
    const prefs = await this.preferencesService.getTripPreferences(
      tripId,
      req.user.id,
    );
    return ResponseUtil.success(prefs ?? {});
  }

  @ApiOperation({ summary: 'Update preferences for a specific trip' })
  @ApiResponse({
    status: 200,
    description: 'Trip preferences updated successfully',
  })
  @ApiBody({
    description: 'Trip-specific preferences (override only for this trip)',
    type: UpdateTripPreferencesDto,
    examples: {
      simple: {
        summary: 'Add dominant activities',
        value: {
          dominantActivities: ['hiking', 'street-food'],
        },
      },
      full: {
        summary: 'Full trip-specific overrides',
        value: {
          inferredStyle: ['adventure', 'budget'],
          dominantActivities: ['hiking', 'museum'],
          foodStyle: ['seafood', 'local-markets'],
          weatherAdjustedPreferences: {
            season: 'rainy',
            avoid: ['outdoor-waterfalls'],
            prefer: ['indoor-museums', 'cooking-class'],
          },
          customPreferences: {
            avoidAreas: ['overcrowded-tourist-district'],
            preferredTransport: 'public-transport',
          },
        },
      },
    },
  })
  @Patch()
  async updateTripPrefs(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripPreferencesDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.preferencesService.upsertTripPreferences(
      tripId,
      req.user.id,
      dto,
    );
    return ResponseUtil.success(updated);
  }
}
