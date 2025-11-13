import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';

@Entity('trip_budgets')
export class TripBudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'total_budget', type: 'decimal', precision: 12, scale: 2 })
  totalBudget: number;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  spentAmount: number;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({
    name: 'notify_threshold',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0.8,
  })
  notifyThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TripEntity, (trip) => trip.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;

  @OneToMany(() => BudgetItemEntity, (item) => item.tripBudget, {
    cascade: true,
  })
  items: BudgetItemEntity[];
}
