import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ItineraryEntity } from './itinerary.entity';
import { TripShareEntity } from './trip-share.entity';
import { BudgetTrackingEntity } from './budget-tracking.entity';
import { TripImageEntity } from './trip-image.entity';
import { TripStatus } from 'src/trip/enum/trip-enum';

/**
 * Trip entity representing the trips table in the database
 */
@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 50, nullable: true })
  timezone?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.PLANNING,
  })
  status: TripStatus;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'enable_cost_tracking', default: true })
  enableCostTracking: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => ItineraryEntity, (itinerary) => itinerary.trip, {
    cascade: true,
    eager: false,
  })
  itinerary: ItineraryEntity[];

  @OneToOne(() => TripShareEntity, (share) => share.trip, {
    cascade: true,
    eager: false,
  })
  shareInfo?: TripShareEntity;

  @OneToMany(() => BudgetTrackingEntity, (budget) => budget.trip, {
    cascade: true,
  })
  budgetTracking: BudgetTrackingEntity[];

  @OneToMany(() => TripImageEntity, (img) => img.trip, { cascade: false })
  images: TripImageEntity[];
}
