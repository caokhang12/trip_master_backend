import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../enum/trip-enum';
import { TripEntity } from '../../schemas/trip.entity';
import { PaginationResult } from '../../shared/types/pagination.types';

export class TripDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() timezone?: string;
  @ApiPropertyOptional({ type: String }) startDate?: Date;
  @ApiPropertyOptional({ type: String }) endDate?: Date;
  @ApiProperty({ enum: TripStatus }) status: TripStatus;
  @ApiPropertyOptional() budget?: number;
  @ApiProperty() currency: string;
  @ApiProperty() isPublic: boolean;
  @ApiProperty() enableCostTracking: boolean;
  @ApiProperty({ type: [String] }) imageUrls: string[];
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AdminTripDto extends TripDto {
  @ApiProperty() userId: string;
}

export class TripListResponseDto {
  @ApiProperty({ type: [TripDto] }) items: TripDto[];
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNext: boolean;
  @ApiProperty() hasPrev: boolean;
}

export class AdminTripListResponseDto {
  @ApiProperty({ type: [AdminTripDto] }) items: AdminTripDto[];
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNext: boolean;
  @ApiProperty() hasPrev: boolean;
}

export class TripMapper {
  static toUserDto(e: TripEntity): TripDto {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      timezone: e.timezone,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      budget: e.budget,
      currency: e.currency,
      isPublic: e.isPublic,
      enableCostTracking: e.enableCostTracking,
      imageUrls: e.imageUrls ?? [],
      thumbnailUrl: e.thumbnailUrl,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  static toAdminDto(e: TripEntity): AdminTripDto {
    return { ...this.toUserDto(e), userId: e.userId };
  }

  static toUserList(result: PaginationResult<TripEntity>): TripListResponseDto {
    return {
      items: result.items.map((i) => this.toUserDto(i)),
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    };
  }

  static toAdminList(
    result: PaginationResult<TripEntity>,
  ): AdminTripListResponseDto {
    return {
      items: result.items.map((i) => this.toAdminDto(i)),
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    };
  }
}
