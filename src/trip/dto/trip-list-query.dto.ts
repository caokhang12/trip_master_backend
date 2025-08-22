import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TripStatus } from '../enum/trip-enum';
import { ExtendedPaginationDto } from '../../shared/dto/page-query.dto';

class TripFiltersDto {
  // status + date range filters only (pagination/search/sort come from ExtendedPaginationDto)

  @ApiPropertyOptional({
    description: 'Filter by trip status',
    enum: TripStatus,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'startDate >= this (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'startDate <= this (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'endDate >= this (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiPropertyOptional({
    description: 'endDate <= this (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;
}

export class TripListQueryDto extends IntersectionType(
  ExtendedPaginationDto,
  TripFiltersDto,
) {
  // Override sort docs with whitelist (repo also whitelists at query level)
  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'startDate', 'endDate', 'title', 'status'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  declare sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  declare sortOrder?: 'ASC' | 'DESC';
}
