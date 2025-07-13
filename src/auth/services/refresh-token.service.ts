import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, MoreThan } from 'typeorm';
import { RefreshTokenEntity } from '../../schemas/refresh-token.entity';
import { UserEntity } from '../../schemas/user.entity';
import { DeviceInfo } from '../utils/device-info.util';

/**
 * Service for managing refresh tokens with enhanced security features
 * Supports multi-device sessions and token lifecycle management
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  /**
   * Create a new refresh token for a user
   */
  async createRefreshToken(
    user: UserEntity,
    token: string,
    expiresAt: Date,
    deviceInfo?: DeviceInfo,
  ): Promise<RefreshTokenEntity> {
    try {
      const refreshToken: RefreshTokenEntity =
        this.refreshTokenRepository.create({
          token,
          user,
          userId: user.id,
          expiresAt,
          deviceInfo,
          isActive: true,
        });

      const savedToken: RefreshTokenEntity =
        await this.refreshTokenRepository.save(refreshToken);
      this.logger.log(`Created refresh token for user ${user.id}`);

      return savedToken;
    } catch (error) {
      this.logger.error(
        `Failed to create refresh token for user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find a valid refresh token
   */
  async findValidToken(token: string): Promise<RefreshTokenEntity | null> {
    try {
      return await this.refreshTokenRepository.findOne({
        where: {
          token,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
        relations: ['user'],
      });
    } catch (error) {
      this.logger.error(`Failed to find refresh token:`, error);
      return null;
    }
  }

  /**
   * Update the last used timestamp for a token
   */
  async updateLastUsed(tokenId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(tokenId, {
        lastUsedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to update last used for token ${tokenId}:`,
        error,
      );
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const result = await this.refreshTokenRepository.update(
        { token },
        { isActive: false },
      );

      if (result.affected && result.affected > 0) {
        this.logger.log(`Revoked refresh token`);
      }
    } catch (error) {
      this.logger.error(`Failed to revoke token:`, error);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const result = await this.refreshTokenRepository.update(
        { userId, isActive: true },
        { isActive: false },
      );

      this.logger.log(
        `Revoked ${result.affected || 0} tokens for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke all tokens for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Revoke all other refresh tokens for a user except the current one
   */
  async revokeOtherUserTokens(
    userId: string,
    currentToken: string,
  ): Promise<void> {
    try {
      const result = await this.refreshTokenRepository.update(
        {
          userId,
          isActive: true,
          token: Not(currentToken),
        },
        { isActive: false },
      );

      this.logger.log(
        `Revoked ${result.affected || 0} other tokens for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke other tokens for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      const deletedCount = result.affected || 0;
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to clean up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<RefreshTokenEntity[]> {
    try {
      return await this.refreshTokenRepository.find({
        where: {
          userId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
        order: {
          lastUsedAt: 'DESC',
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get active sessions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get the count of active sessions for a user
   */
  async getUserActiveSessionCount(userId: string): Promise<number> {
    try {
      return await this.refreshTokenRepository.count({
        where: {
          userId,
          isActive: true,
          expiresAt: MoreThan(new Date()),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get session count for user ${userId}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Revoke a specific session by token ID
   */
  async revokeSession(userId: string, tokenId: string): Promise<boolean> {
    try {
      const result = await this.refreshTokenRepository.update(
        { id: tokenId, userId },
        { isActive: false },
      );

      const success = Boolean(result.affected && result.affected > 0);
      if (success) {
        this.logger.log(`Revoked session ${tokenId} for user ${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Failed to revoke session ${tokenId} for user ${userId}:`,
        error,
      );
      return false;
    }
  }
}
