import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TripBudgetEntity } from './trip-budget.entity';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import { IsEnum } from 'class-validator';

@Entity('budget_items')
export class BudgetItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_budget_id' })
  tripBudgetId: string;

  @Column()
  @IsEnum(ActivityCategory)
  category: ActivityCategory;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 20, nullable: true })
  source?: string;

  @Column({ name: 'ref_id', length: 255, nullable: true })
  refId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TripBudgetEntity, (budget) => budget.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trip_budget_id' })
  tripBudget: TripBudgetEntity;
}
