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
  @ApiProperty({ type: [String] }) imageUrls: string[];
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AdminTripDto extends TripDto {
  @ApiProperty() userId: string;
  @ApiPropertyOptional() ownerFirstName?: string;
  @ApiPropertyOptional() ownerLastName?: string;
  @ApiPropertyOptional() ownerEmail?: string;
}

// Lightweight list item DTOs (no imageUrls to keep payload small)
export class TripListItemDto {
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
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AdminTripListItemDto extends TripListItemDto {
  @ApiProperty() userId: string;
  @ApiPropertyOptional() ownerFirstName?: string;
  @ApiPropertyOptional() ownerLastName?: string;
}

export class TripListResponseDto {
  @ApiProperty({ type: [TripListItemDto] }) items: TripListItemDto[];
  @ApiProperty() meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class AdminTripListResponseDto {
  @ApiProperty({ type: [AdminTripListItemDto] }) items: AdminTripListItemDto[];
  @ApiProperty() meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
    return {
      ...this.toUserDto(e),
      userId: e.userId,
      ownerFirstName: e.user?.firstName,
      ownerLastName: e.user?.lastName,
      ownerEmail: e.user?.email,
    };
  }

  static toUserList(result: Paged<TripEntity>): TripListResponseDto {
    return {
      items: result.items.map((e) => {
        // For list views, avoid building full image arrays; rely on thumbnail only
        const thumb = (e.images || []).find((i) => i.isThumbnail)?.url;
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
          thumbnailUrl: thumb,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        } as TripListItemDto;
      }),
      meta: result.meta,
    };
  }

  static toAdminList(result: Paged<TripEntity>): AdminTripListResponseDto {
    return {
      items: result.items.map((e) => {
        const thumb = (e.images || []).find((i) => i.isThumbnail)?.url;
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
          thumbnailUrl: thumb,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          userId: e.userId,
          ownerFirstName: e.user?.firstName,
          ownerLastName: e.user?.lastName,
        } as AdminTripListItemDto;
      }),
      meta: result.meta,
    };
  }
}
