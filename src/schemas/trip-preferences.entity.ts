import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';
import { TravelStyle } from '../shared/types/base-response.types';

interface WeatherAdjustedPreferences {
  season?: string;
  prefer?: string[];
  avoid?: string[];
  notes?: string;
}

/**
 * Trip-specific preferences entity representing the trip_preferences table.
 * One-to-one with TripEntity. Does NOT modify user long-term preferences.
 */
@Entity('trip_preferences')
export class TripPreferencesEntity {
  @PrimaryColumn('uuid', { name: 'trip_id' })
  tripId: string;

  // Inferred or adjusted travel styles specific to this trip (e.g., seasonal, destination-specific)
  @Column({ name: 'inferred_style', type: 'jsonb', nullable: true })
  inferredStyle?: TravelStyle[] = [];

  // Dominant activities for this trip (e.g., hiking, museums, street food)
  @Column({
    name: 'dominant_activities',
    type: 'text',
    array: true,
    nullable: true,
  })
  dominantActivities?: string[] = [];

  // Preferred food styles/cuisines for the trip (e.g., vegetarian, seafood, street-food)
  @Column({ name: 'food_style', type: 'text', array: true, nullable: true })
  foodStyle?: string[] = [];

  // AI/logic adjusted preferences based on weather/season/context
  @Column({
    name: 'weather_adjusted_preferences',
    type: 'jsonb',
    nullable: true,
  })
  weatherAdjustedPreferences?: WeatherAdjustedPreferences = {};

  // Free-form custom preferences bag for this trip
  @Column({ name: 'custom_preferences', type: 'jsonb', nullable: true })
  customPreferences?: Record<string, unknown> = {};

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;
}
