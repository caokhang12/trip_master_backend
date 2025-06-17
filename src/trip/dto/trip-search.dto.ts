import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../../schemas/trip.entity';
import {
  ExtendedPaginationDto,
  PaginationDto,
} from '../../shared/dto/pagination.dto';

/**
 * Trip query DTO for filtering and pagination
 */
export class TripQueryDto extends ExtendedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by trip status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

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
    description: 'Filter by default currency',
    example: 'JPY',
  })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}

/**
 * Trip search DTO
 */
export class TripSearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'Tokyo adventure',
  })
  @IsString()
  query: string;
}

/**
 * Share trip DTO
 */
export class ShareTripDto {
  @ApiPropertyOptional({
    description: 'Expiration date for the share link',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
