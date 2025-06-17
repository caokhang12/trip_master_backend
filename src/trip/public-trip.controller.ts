import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TripService } from './trip.service';
import { CountryDefaultsService } from '../shared/services/country-defaults.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import { BaseResponseDto, ErrorResponseDto } from '../shared/dto/response.dto';

/**
 * Controller for public trip sharing operations
 */
@ApiTags('Public Trips')
@Controller('public/trips')
export class PublicTripController {
  constructor(
    private readonly tripService: TripService,
    private readonly countryDefaultsService: CountryDefaultsService,
  ) {}

  /**
   * View shared trip (public access)
   */
  @ApiOperation({
    summary: 'Get shared trip',
    description:
      'Retrieves trip details using a public share token. No authentication required.',
  })
  @ApiParam({
    name: 'shareToken',
    type: String,
    description: 'Unique share token generated for the trip',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @ApiResponse({
    status: 200,
    description: 'Shared trip retrieved successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Share token not found or expired',
    type: ErrorResponseDto,
  })
  @Get(':shareToken')
  async findSharedTripByToken(
    @Param('shareToken') shareToken: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.findSharedTripByToken(shareToken);
    return ResponseUtil.success(trip);
  }

  /**
   * Get country defaults for trip planning
   */
  @ApiOperation({
    summary: 'Get country defaults',
    description: 'Retrieve default settings for a specific country',
  })
  @ApiParam({
    name: 'countryCode',
    type: String,
    description: 'ISO country code',
    example: 'VN',
  })
  @ApiResponse({
    status: 200,
    description: 'Country defaults retrieved successfully',
    type: BaseResponseDto,
  })
  @Get('countries/:countryCode/defaults')
  getCountryDefaults(
    @Param('countryCode') countryCode: string,
  ): BaseResponse<any> {
    const defaults = this.countryDefaultsService.getCountryDefaults(
      countryCode.toUpperCase(),
    );
    return ResponseUtil.success(defaults);
  }
}
