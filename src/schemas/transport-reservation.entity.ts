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

@Entity('transport_reservations')
@Index(['tripId'])
@Index(['bookingId'])
export class TransportReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'origin', length: 10 })
  origin: string; // IATA code

  @Column({ name: 'destination', length: 10 })
  destination: string; // IATA code

  @Column({ name: 'departure_at', type: 'timestamptz', nullable: true })
  departureAt?: Date;

  @Column({ name: 'arrival_at', type: 'timestamptz', nullable: true })
  arrivalAt?: Date;

  @Column({ name: 'carrier_code', length: 10, nullable: true })
  carrierCode?: string;

  @Column({ name: 'flight_number', length: 20, nullable: true })
  flightNumber?: string;

  @Column({ name: 'traveler_count', type: 'int', default: 1 })
  travelerCount: number;

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
