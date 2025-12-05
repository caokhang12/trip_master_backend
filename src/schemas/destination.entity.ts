import { ActivityDestinationEntity } from 'src/schemas/activity-destination.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * Destination entity representing the destinations table in the database
 */
@Entity('destinations')
@Index(['country', 'city'])
@Index(['coordinates'])
export class DestinationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  country: string;

  @Column({ name: 'country_code', length: 2 })
  countryCode: string;

  @Column({ name: 'place_id', length: 255, nullable: true, unique: true })
  placeId?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  province?: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  coordinates: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_urls', type: 'text', array: true, nullable: true })
  imageUrls?: string[] | null;

  @Column({ name: 'average_budget', type: 'jsonb', nullable: true })
  averageBudget?: {
    min: number;
    max: number;
    currency: string;
    type: string; // per day, per week, etc.
  };

  @Column({ name: 'best_time_to_visit', type: 'jsonb', nullable: true })
  bestTimeToVisit?: {
    months: string[];
    season: string;
    weather: string;
    notes?: string;
  };

  @Column({ name: 'poi_data', type: 'jsonb', nullable: true })
  poiData?: {
    attractions: any[];
    restaurants: any[];
    hotels: any[];
    activities: any[];
  };

  @Column({ name: 'weather_info', type: 'jsonb', nullable: true })
  weatherInfo?: {
    averageTemp: { min: number; max: number };
    rainfall: number;
    humidity: number;
    season: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(
    () => ActivityDestinationEntity,
    (activityDestinations) => activityDestinations.destination,
    {
      cascade: true,
      eager: false,
    },
  )
  activityDestinations: ActivityDestinationEntity[];
}
