import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TravelStyle } from '../shared/types/base-response.types';

/**
 * Budget range interface for user preferences
 */
interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

/**
 * User preferences entity representing the user_preferences table
 */
@Entity('user_preferences')
export class UserPreferencesEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'travel_style', type: 'jsonb', nullable: true })
  travelStyle?: TravelStyle[];

  @Column({ name: 'budget_range', type: 'jsonb', nullable: true })
  budgetRange?: BudgetRange;

  @Column({ type: 'text', array: true, nullable: true })
  interests?: string[];

  @Column({
    name: 'dietary_restrictions',
    type: 'text',
    array: true,
    nullable: true,
  })
  dietaryRestrictions?: string[];

  @Column({
    name: 'accessibility_needs',
    type: 'text',
    array: true,
    nullable: true,
  })
  accessibilityNeeds?: string[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
