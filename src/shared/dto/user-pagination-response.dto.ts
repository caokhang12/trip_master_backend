import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponse } from '../types/base-response.types';

/**
 * User item for listing
 */
export class UserListItemDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  lastName?: string;

  @ApiProperty({
    description: 'User role',
    enum: ['user', 'admin'],
    example: 'user',
  })
  role: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'User creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Pagination metadata for TypeORM native pagination
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 2,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: true,
  })
  hasPrev: boolean;
}

/**
 * TypeORM native paginated result for users
 */
export class UserPaginationResultDto {
  @ApiProperty({
    description: 'Array of users for current page',
    type: [UserListItemDto],
  })
  items: UserListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

/**
 * Success response for get all users endpoint
 */
export class GetAllUsersSuccessResponseDto
  implements BaseResponse<UserPaginationResultDto>
{
  @ApiProperty({
    description: 'Response status',
    example: 'OK',
  })
  result: 'OK' | 'NG';

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status: number;

  @ApiProperty({
    description: 'Paginated user data',
    type: UserPaginationResultDto,
  })
  data: UserPaginationResultDto;
}
