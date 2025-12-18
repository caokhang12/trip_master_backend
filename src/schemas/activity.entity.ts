import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ItineraryEntity } from './itinerary.entity';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import { ActivityDestinationEntity } from 'src/schemas/activity-destination.entity';

/**
 * Activity entity representing a single activity within an itinerary day.
 * This replaces the prior JSON array for better queryability and relations.
 */
@Entity('activities')
@Index(['itineraryId'])
@Index(['type'])
export class ActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'itinerary_id' })
  itineraryId: string;

  @Column({ length: 10 })
  time: string; // e.g., '09:00'

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number | null; // minutes

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: ActivityCategory | null;

  // Display ordering within the day
  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  // Free-form JSON for extensibility (AI notes, metadata, tags, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  // Structured POI snapshot for Google Places integration
  @Column({ type: 'jsonb', nullable: true })
  poi?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ItineraryEntity, (itinerary) => itinerary.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itinerary_id' })
  itinerary: ItineraryEntity;

  @OneToMany(
    () => ActivityDestinationEntity,
    (activityDestinations) => activityDestinations.activity,
    { nullable: true, onDelete: 'SET NULL' },
  )
  activityDestinations?: ActivityDestinationEntity[] | null;
}
