import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import {
  UserProfileData,
  UserPreferencesData,
} from '../shared/types/base-response.types';
import { Paged, PaginationHelper } from '../shared/types/pagination';
import { UploadService } from '../upload/upload.service';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { UserItemDto } from './dto/list-users-response.dto';
import { Profile } from 'passport-google-oauth20';

/**
 * User management service with profile data transformation and password security
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserPreferencesEntity)
    private readonly preferencesRepository: Repository<UserPreferencesEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['preferences'],
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['preferences'],
    });
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    provider?: string;
    oauthId?: string;
    profile?: Profile;
  }): Promise<UserEntity> {
    const email = userData.email.toLowerCase();
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);

    if (userData.provider && userData.oauthId) {
      // OAuth user creation
      const oauthUser = this.userRepository.create({
        email: email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        provider: userData.provider,
        oauthId: userData.oauthId,
        passwordHash: hashedPassword,
        avatarUrl: userData.profile?.photos?.[0]?.value,
      });
      return this.userRepository.save(oauthUser);
    }

    const user = this.userRepository.create({
      email: userData.email,
      passwordHash: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      provider: userData.provider,
      oauthId: userData.oauthId,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: UpdateUserDto,
  ): Promise<UserEntity> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user basic information
    if (updateData.firstName !== undefined)
      user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.avatarUrl !== undefined)
      user.avatarUrl = updateData.avatarUrl;
    if (updateData.preferredLanguage !== undefined)
      user.preferredLanguage = updateData.preferredLanguage;
    if (updateData.preferredCurrency !== undefined)
      user.preferredCurrency = updateData.preferredCurrency;
    if (updateData.homeCountry !== undefined)
      user.homeCountry = updateData.homeCountry;

    await this.userRepository.save(user);

    // Update preferences if provided
    if (updateData.preferences) {
      await this.updatePreferences(userId, updateData.preferences);
    }

    return this.findById(userId) as Promise<UserEntity>;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferencesData: UserPreferencesData,
  ): Promise<UserPreferencesEntity> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        ...preferencesData,
      });
    } else {
      Object.assign(preferences, preferencesData);
    }

    return this.preferencesRepository.save(preferences);
  }

  /**
   * Update user security fields (login attempts, lock status, etc.)
   */
  async updateUserSecurity(
    userId: string,
    securityData: {
      failedLoginAttempts?: number;
      lockedUntil?: Date | null;
      lastLoginAt?: Date;
      lastLoginIp?: string;
    },
  ): Promise<void> {
    await this.userRepository.update(userId, {
      ...securityData,
      lockedUntil: securityData.lockedUntil || undefined,
    });
  }

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await this.userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expiresAt,
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return false;
    }
    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    return true;
  }

  /**
   * Verify email with token and return user data
   */
  async verifyEmailAndGetUser(token: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      return null;
    }

    await this.userRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    return user;
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(email: string, token: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) {
      return false;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await this.userRepository.update(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    });

    return true;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      return false;
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    return true;
  }

  /**
   * Verify user password
   */
  async verifyPassword(user: UserEntity, password: string): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Updates user avatar through upload service integration
   * @param userId - User identifier
   * @param file - Avatar image file
   * @returns Updated user with new avatar URL
   */
  async updateUserAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserProfileData> {
    // Validate user exists
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Call upload service for avatar processing
    await this.uploadService.uploadAvatar(userId, file);

    // Get updated user data
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return this.transformToProfileData(updatedUser);
  }

  /**
   * Removes user avatar and cleans up Cloudinary storage
   * @param userId - User identifier
   * @returns Updated user without avatar
   */
  async removeUserAvatar(userId: string): Promise<UserProfileData> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarUrl) {
      // Extract public_id from current avatar_url using CloudinaryService
      const publicId = this.uploadService.extractPublicIdFromUrl(
        user.avatarUrl,
      );
      if (publicId) {
        // Call upload service for file deletion
        // This will also cleanup the database reference
        await this.uploadService.deleteFile(userId, publicId);
      }
    } else {
      // If no avatar exists, just return current profile
      return this.transformToProfileData(user);
    }

    // Get updated user data after cleanup
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }

    return this.transformToProfileData(updatedUser);
  }

  /**
   * Update user entity fields directly
   */
  async updateUserFields(
    userId: string,
    updateData: Partial<UserEntity>,
  ): Promise<void> {
    await this.userRepository.update(userId, updateData);
  }

  /**
   * Save user entity
   */
  async saveUser(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.save(user);
  }

  /**
   * Transform user entity to profile data
   * @param user - User entity
   * @returns User profile data
   */
  transformToProfileData(user: UserEntity): UserProfileData {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      hasAvatar: Boolean(user.avatarUrl),
      role: user.role,
      emailVerified: user.emailVerified,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      homeCountry: user.homeCountry,
      preferences: user.preferences
        ? {
            travelStyle: user.preferences.travelStyle,
            budgetRange: user.preferences.budgetRange,
            interests: user.preferences.interests,
            dietaryRestrictions: user.preferences.dietaryRestrictions,
            accessibilityNeeds: user.preferences.accessibilityNeeds,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Transform user entity to list item (sanitized, no sensitive fields)
   */
  transformToListItem(user: UserEntity): UserItemDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get all users with native TypeORM pagination
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Paginated user results with metadata
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<Paged<UserItemDto>> {
    const {
      page: validatedPage,
      limit: validatedLimit,
      skip,
    } = PaginationHelper.validateParams(page, limit);

    // Whitelist allowed sort fields to prevent SQL injection / unexpected sorts
    const allowedSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      role: 'role',
    };
    const sortField =
      sortBy && allowedSortFields[sortBy] ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.userRepository.findAndCount({
      relations: ['preferences'],
      order: { [sortField]: orderDirection },
      skip,
      take: validatedLimit,
    });

    const sanitizedItems = items.map((u) => this.transformToListItem(u));

    return PaginationHelper.createResult(
      sanitizedItems,
      total,
      validatedPage,
      validatedLimit,
    );
  }
}
