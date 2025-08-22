import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { TripEntity } from './trip.entity';

@Entity('trip_images')
@Index(['tripId'])
export class TripImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @Column({ name: 'public_id', length: 255 })
  publicId: string;

  @Column({ name: 'url', type: 'text' })
  url: string;

  @Column({ name: 'is_thumbnail', type: 'boolean', default: false })
  isThumbnail: boolean;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'confirmed', type: 'boolean', default: true })
  confirmed: boolean;

  @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'now()' })
  uploadedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relation back to trip
  @ManyToOne(() => TripEntity, (trip) => trip.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;
}
