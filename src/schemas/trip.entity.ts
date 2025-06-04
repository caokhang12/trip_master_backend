import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ItineraryEntity } from './itinerary.entity';
import { TripShareEntity } from './trip-share.entity';

export enum TripStatus {
  PLANNING = 'planning',
  BOOKED = 'booked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface DestinationCoords {
  lat: number;
  lng: number;
}

/**
 * Trip entity representing the trips table in the database
 */
@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'destination_name', length: 255 })
  destinationName: string;

  @Column({ name: 'destination_coords', type: 'json', nullable: true })
  destinationCoords?: DestinationCoords;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget?: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.PLANNING,
  })
  status: TripStatus;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => ItineraryEntity, (itinerary) => itinerary.trip, {
    cascade: true,
    eager: false,
  })
  itinerary: ItineraryEntity[];

  @OneToOne(() => TripShareEntity, (share) => share.trip, {
    cascade: true,
    eager: false,
  })
  shareInfo?: TripShareEntity;
}
