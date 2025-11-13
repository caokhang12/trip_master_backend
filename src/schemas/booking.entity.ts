import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';
import { UserEntity } from './user.entity';
import { PaymentEntity } from 'src/schemas/payment.entity';

export enum BookingType {
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  ATTRACTION = 'ATTRACTION',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('bookings')
@Index(['userId'])
@Index(['tripId'])
@Index(['provider'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: BookingType })
  type: BookingType;

  @Column({ length: 50 })
  provider: string; // e.g. 'amadeus'

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ name: 'offer_id', nullable: true })
  offerId?: string;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalPrice?: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'provider_payload', type: 'jsonb', nullable: true })
  providerPayload?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => PaymentEntity, (p) => p.booking, { cascade: true })
  payments: PaymentEntity[];
}
