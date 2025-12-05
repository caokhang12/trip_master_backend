import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TripBudgetEntity } from './trip-budget.entity';

export enum BudgetAuditAction {
  CREATE_BUDGET = 'CREATE_BUDGET',
  UPDATE_BUDGET = 'UPDATE_BUDGET',
  DELETE_BUDGET = 'DELETE_BUDGET',
  ADD_ITEM = 'ADD_ITEM',
  UPDATE_ITEM = 'UPDATE_ITEM',
  DELETE_ITEM = 'DELETE_ITEM',
  THRESHOLD_ALERT = 'THRESHOLD_ALERT',
}

@Entity('budget_audit_logs')
export class BudgetAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'budget_id' })
  budgetId: string;

  @Column({
    type: 'enum',
    enum: BudgetAuditAction,
  })
  action: BudgetAuditAction;

  @Column({ name: 'previous_value', type: 'jsonb', nullable: true })
  previousValue?: Record<string, any>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => TripBudgetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget: TripBudgetEntity;
}
