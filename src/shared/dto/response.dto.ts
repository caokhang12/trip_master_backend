import { ApiProperty } from '@nestjs/swagger';
import { UserRole, TravelStyle } from '../types/base-response.types';

export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Response result indicator',
    enum: ['OK', 'NG'],
    example: 'OK',
  })
  result: 'OK' | 'NG';

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status: number;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;
}

export class ErrorResponseDataDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed error information',
    type: [String],
    required: false,
    example: ['Email must be a valid email address', 'Password is too short'],
  })
  details?: string[];

  @ApiProperty({
    description: 'Error code for client handling',
    required: false,
    example: 'VALIDATION_ERROR',
  })
  code?: string;
}

export class UserProfileDataDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    required: false,
    example: 'John',
  })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    required: false,
    example: 'Doe',
  })
  lastName?: string;

  @ApiProperty({
    description: 'User avatar URL',
    required: false,
    example: 'https://example.com/avatars/john-doe.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description:
      'User home country for localized content and currency preferences',
    required: false,
    example: 'Vietnam',
  })
  homeCountry?: string;

  @ApiProperty({
    description: 'User preferred language for the application interface',
    required: false,
    example: 'vi',
    enum: ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'],
  })
  preferredLanguage?: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last profile update timestamp',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: Date;
}

export class BudgetRangeDto {
  @ApiProperty({
    description: 'Minimum budget amount',
    minimum: 0,
    example: 500,
  })
  min: number;

  @ApiProperty({
    description: 'Maximum budget amount',
    minimum: 0,
    example: 2000,
  })
  max: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
  })
  currency: string;
}

export class UserPreferencesDataDto {
  @ApiProperty({
    description: 'Preferred travel styles',
    enum: TravelStyle,
    isArray: true,
    required: false,
    example: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
  })
  travelStyle?: TravelStyle[];

  @ApiProperty({
    description: 'Budget range for trips',
    type: BudgetRangeDto,
    required: false,
  })
  budgetRange?: BudgetRangeDto;

  @ApiProperty({
    description: 'User interests and hobbies',
    type: [String],
    required: false,
    example: ['photography', 'hiking', 'museums', 'local cuisine'],
  })
  interests?: string[];

  @ApiProperty({
    description: 'Dietary restrictions and preferences',
    type: [String],
    required: false,
    example: ['vegetarian', 'gluten-free'],
  })
  dietaryRestrictions?: string[];

  @ApiProperty({
    description: 'Accessibility requirements',
    type: [String],
    required: false,
    example: ['wheelchair accessible', 'hearing assistance'],
  })
  accessibilityNeeds?: string[];
}

export class AuthResponseDataDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'User profile information',
    type: UserProfileDataDto,
  })
  user_profile: UserProfileDataDto;
}

/**
 * Success response DTOs for specific endpoints
 */
export class AuthSuccessResponseDto extends BaseResponseDto<AuthResponseDataDto> {
  @ApiProperty({ type: AuthResponseDataDto })
  declare data: AuthResponseDataDto;
}

export class UserProfileSuccessResponseDto extends BaseResponseDto<UserProfileDataDto> {
  @ApiProperty({ type: UserProfileDataDto })
  declare data: UserProfileDataDto;
}

export class ErrorResponseDto extends BaseResponseDto<ErrorResponseDataDto> {
  @ApiProperty({ type: ErrorResponseDataDto })
  declare data: ErrorResponseDataDto;
}

export class VerificationSuccessResponseDto extends BaseResponseDto<{
  verified: boolean;
}> {
  @ApiProperty({
    type: 'object',
    properties: {
      verified: { type: 'boolean', example: true },
    },
  })
  declare data: { verified: boolean };
}

export class EmailSentSuccessResponseDto extends BaseResponseDto<{
  sent: boolean;
}> {
  @ApiProperty({
    type: 'object',
    properties: {
      sent: { type: 'boolean', example: true },
    },
  })
  declare data: { sent: boolean };
}

export class PasswordResetSuccessResponseDto extends BaseResponseDto<{
  reset: boolean;
}> {
  @ApiProperty({
    type: 'object',
    properties: {
      reset: { type: 'boolean', example: true },
    },
  })
  declare data: { reset: boolean };
}

export class LogoutSuccessResponseDto extends BaseResponseDto<{
  logout: boolean;
}> {
  @ApiProperty({
    type: 'object',
    properties: {
      logout: { type: 'boolean', example: true },
    },
  })
  declare data: { logout: boolean };
}

export class AdminTestResponseDto extends BaseResponseDto<{
  message: string;
  timestamp: Date;
}> {
  @ApiProperty({
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Module is working correctly' },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  declare data: { message: string; timestamp: Date };
}
