import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TripEntity } from './trip.entity';

export interface Activity {
  time: string;
  title: string;
  description?: string;
  location?: string;
  duration?: number; // in minutes
  cost?: number;
  type?: string; // e.g., 'transportation', 'sightseeing', 'dining'
}

/**
 * Itinerary entity representing the itineraries table in the database
 */
@Entity('itineraries')
@Unique(['tripId', 'dayNumber'])
export class ItineraryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'day_number' })
  dayNumber: number;

  @Column({ type: 'date', nullable: true })
  date?: Date;

  @Column({ type: 'json' })
  activities: Activity[];

  @Column({ name: 'ai_generated', default: false })
  aiGenerated: boolean;

  @Column({ name: 'user_modified', default: false })
  userModified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TripEntity, (trip) => trip.itinerary, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;
}
