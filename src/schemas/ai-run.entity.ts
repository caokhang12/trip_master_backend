import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_runs')
@Index(['createdAt'])
@Index(['requestId'])
@Index(['userId'])
@Index(['tripId'])
@Index(['taskType'])
@Index(['provider'])
export class AiRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId?: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId?: string | null;

  @Column({ name: 'task_type', type: 'varchar', length: 64, nullable: true })
  taskType?: string | null;

  @Column({ name: 'provider', type: 'varchar', length: 32, nullable: true })
  provider?: string | null;

  @Column({ name: 'fallback_used', type: 'boolean', default: false })
  fallbackUsed: boolean;

  @Column({ name: 'cache_redis_hit', type: 'boolean', default: false })
  cacheRedisHit: boolean;

  @Column({ name: 'cache_memory_hit', type: 'boolean', default: false })
  cacheMemoryHit: boolean;

  @Column({ name: 'total_ms', type: 'int', nullable: true })
  totalMs?: number | null;

  @Column({ name: 'provider_ms', type: 'int', nullable: true })
  providerMs?: number | null;

  @Column({ name: 'parse_ms', type: 'int', nullable: true })
  parseMs?: number | null;

  @Column({ name: 'json_valid', type: 'boolean', default: false })
  jsonValid: boolean;

  @Column({ name: 'json_repaired', type: 'boolean', default: false })
  jsonRepaired: boolean;

  @Column({ name: 'schema_errors_count', type: 'int', default: 0 })
  schemaErrorsCount: number;

  @Column({ name: 'days_count', type: 'int', nullable: true })
  daysCount?: number | null;

  @Column({ name: 'activities_count', type: 'int', nullable: true })
  activitiesCount?: number | null;

  @Column({ name: 'poi_count', type: 'int', nullable: true })
  poiCount?: number | null;

  @Column({ name: 'poi_dropped_count', type: 'int', nullable: true })
  poiDroppedCount?: number | null;

  @Column({ name: 'prompt_hash', type: 'varchar', length: 64, nullable: true })
  promptHash?: string | null;

  @Column({ name: 'prompt_length', type: 'int', nullable: true })
  promptLength?: number | null;

  @Column({ name: 'response_length', type: 'int', nullable: true })
  responseLength?: number | null;

  @Column({ name: 'currency_hint', type: 'varchar', length: 8, nullable: true })
  currencyHint?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
