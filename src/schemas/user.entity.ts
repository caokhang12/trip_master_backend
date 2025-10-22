import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRole } from '../shared/types/base-response.types';
import { UserPreferencesEntity } from './user-preferences.entity';
import { RefreshTokenEntity } from './refresh-token.entity';

/**
 * User entity representing the users table in the database
 */
@Entity('users')
@Index(['homeCountry'])
@Index(['preferredLanguage'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash?: string;

  @Column({ name: 'provider', length: 50, default: 'local' })
  provider: string;

  @Column({ name: 'oauth_id', nullable: true })
  oauthId?: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName?: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({
    name: 'preferred_language',
    length: 10,
    nullable: true,
    default: 'en',
  })
  preferredLanguage?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'home_country', length: 100, nullable: true })
  homeCountry?: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken?: string;

  @Column({ name: 'email_verification_expires', nullable: true })
  emailVerificationExpires?: Date;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_expires', nullable: true })
  passwordResetExpires?: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserPreferencesEntity, (preferences) => preferences.user, {
    cascade: true,
  })
  preferences?: UserPreferencesEntity;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshTokenEntity[];

  /**
   * Check if the account is currently locked
   */
  get isLocked(): boolean {
    return (
      this.lockedUntil !== undefined &&
      this.lockedUntil !== null &&
      this.lockedUntil > new Date()
    );
  }

  /**
   * Check if the account needs to be locked due to failed attempts
   */
  shouldLock(maxAttempts: number = 5): boolean {
    return this.failedLoginAttempts >= maxAttempts;
  }

  /**
   * Reset failed login attempts
   */
  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
  }

  /**
   * Increment failed login attempts and lock if necessary
   */
  incrementFailedAttempts(
    maxAttempts: number = 5,
    lockDurationMinutes: number = 15,
  ): void {
    this.failedLoginAttempts += 1;

    if (this.shouldLock(maxAttempts)) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);
      this.lockedUntil = lockUntil;
    }
  }

  /**
   * Computed property for avatar status
   */
  get hasAvatar(): boolean {
    return (
      this.avatarUrl !== null &&
      this.avatarUrl !== undefined &&
      this.avatarUrl.length > 0
    );
  }

  /**
   * Gets optimized avatar URL for display
   * @param transformation - Cloudinary transformation options
   * @returns Transformed avatar URL or null
   */
  getAvatarUrl(transformation?: {
    width?: number;
    height?: number;
  }): string | null {
    if (!this.avatarUrl) return null;

    if (transformation?.width || transformation?.height) {
      // Simple transformation for avatar URL
      const { width = 200, height = 200 } = transformation;
      return this.avatarUrl.replace(
        '/upload/',
        `/upload/w_${width},h_${height},c_fill/`,
      );
    }

    return this.avatarUrl;
  }

  get displayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) {
      return this.firstName;
    }
    if (this.lastName) {
      return this.lastName;
    }
    return this.email.split('@')[0];
  }
}
