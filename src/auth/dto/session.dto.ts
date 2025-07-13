import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * DTO for session management responses
 */
export class SessionDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Device information',
    example: {
      deviceType: 'web',
      deviceName: 'Chrome',
    },
  })
  deviceInfo: {
    deviceType?: 'web' | 'mobile' | 'tablet';
    deviceName?: string;
  };

  @ApiProperty({
    description: 'Session creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last used date',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
  })
  lastUsedAt?: Date;

  @ApiProperty({
    description: 'Session expiration date',
    example: '2024-01-08T00:00:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Whether this is the current session',
    example: true,
  })
  isCurrent: boolean;
}

/**
 * DTO for revoking a specific session
 */
export class RevokeSessionDto {
  @ApiProperty({
    description: 'Session ID to revoke',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Session ID must be a valid UUID' })
  sessionId: string;
}

/**
 * DTO for logout from all devices response
 */
export class LogoutAllResponseDto {
  @ApiProperty({
    description: 'Whether logout from all devices was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of sessions revoked',
    example: 3,
  })
  revokedSessions: number;
}

/**
 * DTO for session activity
 */
export class SessionActivityDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Activity timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Activity type',
    example: 'login',
    enum: ['login', 'refresh', 'logout'],
  })
  activityType: 'login' | 'refresh' | 'logout';

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.1',
    required: false,
  })
  ipAddress?: string;
}
