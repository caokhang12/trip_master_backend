import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import { BaseResponseDto, ErrorResponseDto } from '../shared/dto/response.dto';
import { AuthRequest } from '../shared/interfaces/auth.interface';

/**
 * Controller for cost tracking and budget analysis
 */
@ApiTags('Cost Tracking')
@ApiBearerAuth()
@Controller('trips/:tripId/costs')
@UseGuards(JwtAuthGuard)
export class CostTrackingController {
  constructor(private readonly itineraryService: ItineraryService) {}

  /**
   * Get cost analysis for a trip
   */
  @ApiOperation({
    summary: 'Get cost analysis',
    description: 'Get detailed cost analysis for a trip',
  })
  @ApiParam({
    name: 'tripId',
    description: 'Trip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Cost analysis retrieved successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @Get('analysis')
  async getCostAnalysis(
    @Param('tripId') tripId: string,
    @Req() req: AuthRequest,
  ): Promise<BaseResponse<any>> {
    const result = await this.itineraryService.getCostAnalysis(
      tripId,
      req.user.id,
    );
    return ResponseUtil.success(result);
  }

  /**
   * Get budget summary for a trip
   */
  @ApiOperation({
    summary: 'Get budget summary',
    description: 'Get budget utilization summary for a trip',
  })
  @ApiParam({
    name: 'tripId',
    description: 'Trip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget summary retrieved successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @Get('budget-summary')
  async getBudgetSummary(
    @Param('tripId') tripId: string,
    @Req() req: AuthRequest,
  ): Promise<BaseResponse<any>> {
    const result = await this.itineraryService.getBudgetSummary(
      tripId,
      req.user.id,
    );
    return ResponseUtil.success(result);
  }
}
