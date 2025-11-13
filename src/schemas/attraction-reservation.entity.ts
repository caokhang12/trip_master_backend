import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { TripEntity } from './trip.entity';

@Entity('attraction_reservations')
@Index(['tripId'])
@Index(['bookingId'])
export class AttractionReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'provider_item_id', nullable: true })
  providerItemId?: string; // Klook/GYG product id

  @Column({ name: 'date', type: 'date', nullable: true })
  date?: Date;

  @Column({ name: 'participants', type: 'int', default: 1 })
  participants: number;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @ManyToOne(() => TripEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;
}
