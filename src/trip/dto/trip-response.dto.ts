import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../enum/trip-enum';
import { TripEntity } from '../../schemas/trip.entity';
import { TripImageEntity } from '../../schemas/trip-image.entity';
import { Paged } from '../../shared/types/pagination';

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
  @ApiProperty({ type: [String] }) imageUrls: string[]; // derived
  @ApiPropertyOptional() thumbnailUrl?: string; // derived
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
    const imgs: TripImageEntity[] = e.images || [];
    const sorted = imgs.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const imageUrls = sorted.map((i) => i.url);
    const thumbnail = sorted.find((i) => i.isThumbnail)?.url;
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
      imageUrls,
      thumbnailUrl: thumbnail,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  static toAdminDto(e: TripEntity): AdminTripDto {
    return { ...this.toUserDto(e), userId: e.userId };
  }

  static toUserList(result: Paged<TripEntity>): TripListResponseDto {
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

  static toAdminList(result: Paged<TripEntity>): AdminTripListResponseDto {
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
