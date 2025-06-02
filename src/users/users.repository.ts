import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';

/**
 * Repository interface for user operations
 */
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByEmailVerificationToken(token: string): Promise<UserEntity | null>;
  findByPasswordResetToken(token: string): Promise<UserEntity | null>;
  create(userData: Partial<UserEntity>): Promise<UserEntity>;
  save(user: UserEntity): Promise<UserEntity>;
  update(id: string, userData: Partial<UserEntity>): Promise<void>;
  delete(id: string): Promise<void>;
  createPreferences(
    preferences: Partial<UserPreferencesEntity>,
  ): Promise<UserPreferencesEntity>;
  updatePreferences(
    userId: string,
    preferences: Partial<UserPreferencesEntity>,
  ): Promise<void>;
  findPreferences(userId: string): Promise<UserPreferencesEntity | null>;
}

/**
 * TypeORM implementation of the user repository
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserPreferencesEntity)
    private readonly preferencesRepository: Repository<UserPreferencesEntity>,
  ) {}

  /**
   * Find user by ID with optional relations
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['preferences'],
    });
  }

  /**
   * Find user by email with optional relations
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['preferences'],
    });
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(
    token: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { emailVerificationToken: token },
      relations: ['preferences'],
    });
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
      relations: ['preferences'],
    });
  }

  /**
   * Create a new user
   */
  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  /**
   * Save user entity
   */
  async save(user: UserEntity): Promise<UserEntity> {
    return this.userRepository.save(user);
  }

  /**
   * Update user by ID
   */
  async update(id: string, userData: Partial<UserEntity>): Promise<void> {
    await this.userRepository.update(id, userData);
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  /**
   * Create user preferences
   */
  async createPreferences(
    preferences: Partial<UserPreferencesEntity>,
  ): Promise<UserPreferencesEntity> {
    const newPreferences = this.preferencesRepository.create(preferences);
    return this.preferencesRepository.save(newPreferences);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferencesEntity>,
  ): Promise<void> {
    await this.preferencesRepository.upsert({ userId, ...preferences }, [
      'userId',
    ]);
  }

  /**
   * Find user preferences by user ID
   */
  async findPreferences(userId: string): Promise<UserPreferencesEntity | null> {
    return this.preferencesRepository.findOne({
      where: { userId },
    });
  }
}
