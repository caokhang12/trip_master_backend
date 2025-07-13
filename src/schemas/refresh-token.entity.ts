import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * RefreshToken entity for managing user authentication sessions
 * Supports multi-device authentication and enhanced security
 */
@Entity('refresh_tokens')
@Index(['token'])
@Index(['userId', 'isActive'])
@Index(['expiresAt'])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  token: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    deviceType?: 'web' | 'mobile' | 'tablet';
    deviceName?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt?: Date;

  /**
   * Check if the token is still valid
   */
  get isValid(): boolean {
    return this.isActive && this.expiresAt > new Date();
  }

  /**
   * Get a sanitized version of device info for client response
   */
  get sanitizedDeviceInfo(): Partial<typeof this.deviceInfo> {
    if (!this.deviceInfo) return {};

    return {
      deviceType: this.deviceInfo.deviceType,
      deviceName: this.deviceInfo.deviceName,
    };
  }
}
