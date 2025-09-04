import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TripEntity } from './trip.entity';
import { ActivityCostEntity } from './activity-cost.entity';
import { ActivityEntity } from './activity.entity';

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

  @Column({ name: 'destination_id' })
  destinationId: string;

  @Column({ name: 'day_number' })
  dayNumber: number;

  @Column({ type: 'date', nullable: true })
  date?: Date;

  @Column({ name: 'ai_generated', default: false })
  aiGenerated: boolean;

  @Column({ name: 'user_modified', default: false })
  userModified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Cost tracking fields
  @Column({
    name: 'estimated_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  estimatedCost: number;

  @Column({
    name: 'actual_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualCost?: number;

  @Column({ name: 'cost_currency', length: 3, default: 'USD' })
  costCurrency: string;

  @Column({ name: 'cost_breakdown', type: 'jsonb', nullable: true })
  costBreakdown?: Record<string, number>;

  // Relations
  @ManyToOne(() => TripEntity, (trip) => trip.itinerary, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;

  @OneToMany(() => ActivityCostEntity, (cost) => cost.itinerary, {
    cascade: true,
  })
  activityCosts: ActivityCostEntity[];

  // New normalized activities relation replacing the old JSON column
  @OneToMany(() => ActivityEntity, (activity) => activity.itinerary, {
    cascade: ['insert', 'update'],
  })
  activities: ActivityEntity[];
}
