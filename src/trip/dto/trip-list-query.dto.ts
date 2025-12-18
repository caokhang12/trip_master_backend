import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { TripStatus } from '../enum/trip-enum';
import { ExtendedPaginationDto } from '../../shared/dto/page-query.dto';

export class TripListQueryDto extends ExtendedPaginationDto {
  // status + date range filters only (pagination/search/sort come from ExtendedPaginationDto)

  @ApiPropertyOptional({
    description: 'Filter by trip status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'startDate >= this (YYYY-MM-DD)',
    example: '2025-12-01',
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
    example: '2025-12-01',
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

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'startDate', 'endDate', 'title', 'status', 'budget'],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  declare sortBy?:
    | 'createdAt'
    | 'startDate'
    | 'endDate'
    | 'title'
    | 'status'
    | 'budget';

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
