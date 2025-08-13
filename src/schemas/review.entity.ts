import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  DeleteDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TripEntity } from './trip.entity';
import { DestinationEntity } from './destination.entity';

/**
 * Review entity representing the reviews table in the database
 * A review can be associated with either a trip or a destination (at least one must be present)
 */
@Entity('reviews')
// A user can only review a given trip once
@Index('UQ_review_user_trip', ['userId', 'tripId'], {
  unique: true,
  where: 'trip_id IS NOT NULL',
})
// A user can only review a given destination once
@Index('UQ_review_user_destination', ['userId', 'destinationId'], {
  unique: true,
  where: 'destination_id IS NOT NULL',
})
@Check('CHK_reviews_rating', 'rating >= 1 AND rating <= 5')
@Check(
  'CHK_reviews_target_present',
  '(trip_id IS NOT NULL AND destination_id IS NULL) OR (destination_id IS NOT NULL AND trip_id IS NULL)',
)
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId?: string | null;

  @Column({ name: 'destination_id', type: 'uuid', nullable: true })
  destinationId?: string | null;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  // Relations
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'trip_id' })
  trip?: TripEntity | null;

  @ManyToOne(() => DestinationEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'destination_id' })
  destination?: DestinationEntity | null;
}
