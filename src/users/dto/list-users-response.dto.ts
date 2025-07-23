import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponse } from '../../shared/types/base-response.types';
import { PaginationResult } from '../../shared/types/pagination.types';

/**
 * User item for listing
 */
export class UserItemDto {
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
 * Success response for list users endpoint
 */
export class ListUsersResponseDto
  implements BaseResponse<PaginationResult<UserItemDto>>
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
    description: 'Paginated user data with items and meta',
  })
  data: PaginationResult<UserItemDto>;
}
