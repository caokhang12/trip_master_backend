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

@Entity('lodging_reservations')
@Index(['tripId'])
@Index(['bookingId'])
export class LodgingReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'hotel_id', nullable: true })
  hotelId?: string; // Amadeus hotelId

  @Column({ name: 'offer_id', nullable: true })
  offerId?: string; // Amadeus hotel offer id

  @Column({ name: 'check_in', type: 'date' })
  checkIn: Date;

  @Column({ name: 'check_out', type: 'date' })
  checkOut: Date;

  @Column({ name: 'guest_count', type: 'int', default: 1 })
  guestCount: number;

  @Column({ name: 'room_description', type: 'text', nullable: true })
  roomDescription?: string;

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
