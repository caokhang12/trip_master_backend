import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../enum/trip-enum';

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
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() destinationLocation?: {
    placeId: string;
    name: string;
    province?: string;
    country: string;
    city?: string;
    lat: number;
    lng: number;
  };
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
