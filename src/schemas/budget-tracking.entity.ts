import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';

/**
 * Budget tracking entity for trip-level budget management
 */
@Entity('budget_tracking')
export class BudgetTrackingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ length: 50 })
  category: string;

  @Column({ name: 'budgeted_amount', type: 'decimal', precision: 10, scale: 2 })
  budgetedAmount: number;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  spentAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'auto_calculated', default: true })
  autoCalculated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => TripEntity, (trip) => trip.budgetTracking, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;
}
