import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ItineraryEntity } from './itinerary.entity';

/**
 * Activity cost entity for granular cost tracking per activity
 */
@Entity('activity_costs')
export class ActivityCostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'itinerary_id' })
  itineraryId: string;

  @Column({ name: 'activity_index' })
  activityIndex: number;

  @Column({ name: 'cost_type' })
  costType: string;

  @Column({
    name: 'estimated_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  estimatedAmount: number;

  @Column({
    name: 'actual_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualAmount?: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'cost_source', length: 100, nullable: true })
  costSource?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ItineraryEntity, (itinerary) => itinerary.activityCosts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'itinerary_id' })
  itinerary: ItineraryEntity;
}
