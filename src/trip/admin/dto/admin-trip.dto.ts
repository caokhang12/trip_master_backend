import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../../../schemas/trip.entity';
import { ExtendedPaginationDto } from '../../../shared/dto/pagination.dto';

/**
 * Admin trip query DTO with extended filtering capabilities
 */
export class AdminTripQueryDto extends ExtendedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by trip status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user email',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Filter by destination country',
    example: 'JP',
  })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter by destination city',
    example: 'Tokyo',
  })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Filter by timezone',
    example: 'Asia/Tokyo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Filter trips created after this date',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter trips created before this date',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter trips with start date after this date',
    example: '2023-06-01',
  })
  @IsOptional()
  @IsDateString()
  startDateAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter trips with start date before this date',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  startDateBefore?: string;

  @ApiPropertyOptional({
    description: 'Include trips that are shared publicly',
    example: true,
  })
  @IsOptional()
  isShared?: boolean;
}

/**
 * Response DTO for admin trip with user information
 */
export class AdminTripResponseDto {
  @ApiPropertyOptional({ description: 'Trip ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Trip title' })
  title: string;

  @ApiPropertyOptional({ description: 'Trip description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Trip status', enum: TripStatus })
  status: TripStatus;

  @ApiPropertyOptional({ description: 'Destination name' })
  destinationName?: string;

  @ApiPropertyOptional({ description: 'Destination country' })
  destinationCountry?: string;

  @ApiPropertyOptional({ description: 'Destination city' })
  destinationCity?: string;

  @ApiPropertyOptional({ description: 'Trip start date' })
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Trip end date' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Trip creation date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Trip last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Trip thumbnail URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Is trip shared publicly' })
  isShared: boolean;

  @ApiPropertyOptional({ description: 'Share token if shared' })
  shareToken?: string;

  @ApiPropertyOptional({ description: 'User information' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
  };

  @ApiPropertyOptional({ description: 'Trip statistics' })
  statistics: {
    itineraryCount: number;
    totalActivities: number;
    estimatedCost?: number;
  };
}
