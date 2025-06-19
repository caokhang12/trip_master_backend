import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { UserRole } from '../shared/types/base-response.types';
import { UserPreferencesEntity } from './user-preferences.entity';

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
  passwordHash: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName?: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({ name: 'home_country', length: 100, nullable: true })
  homeCountry?: string;

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

  @Column({ name: 'refresh_token', nullable: true })
  refreshToken?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserPreferencesEntity, (preferences) => preferences.user, {
    cascade: true,
  })
  preferences?: UserPreferencesEntity;

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
