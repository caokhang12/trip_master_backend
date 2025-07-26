import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TripService } from '../services/trip.service';
import { ResponseUtil } from '../../shared/utils/response.util';
import { BaseResponse } from '../../shared/types/base-response.types';
import {
  BaseResponseDto,
  ErrorResponseDto,
} from '../../shared/dto/response.dto';

/**
 * Controller for public trip sharing operations
 */
@ApiTags('Public Trips')
@Controller('public/trips')
export class PublicTripController {
  constructor(private readonly tripService: TripService) {}

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
}
