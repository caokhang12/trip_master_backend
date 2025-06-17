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
import { BudgetTrackingEntity } from './budget-tracking.entity';

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

  @Column({ name: 'destination_country', length: 2, nullable: true })
  destinationCountry?: string;

  @Column({ name: 'destination_province', length: 255, nullable: true })
  destinationProvince?: string;

  @Column({ name: 'destination_city', length: 255, nullable: true })
  destinationCity?: string;

  @Column({ length: 50, nullable: true })
  timezone?: string;

  @Column({ name: 'default_currency', length: 3, nullable: true })
  defaultCurrency?: string;

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

  @Column({ name: 'enable_cost_tracking', default: true })
  enableCostTracking: boolean;

  @Column('text', {
    name: 'image_urls',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  imageUrls: string[];

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Computed properties for image management
   */
  get imageCount(): number {
    return this.imageUrls?.length || 0;
  }

  get hasImages(): boolean {
    return this.imageCount > 0;
  }

  get hasThumbnail(): boolean {
    return this.thumbnailUrl !== null && this.thumbnailUrl !== undefined;
  }

  /**
   * Gets gallery data with optimized URLs
   */
  getImageGallery(): {
    thumbnail: string | null;
    images: Array<{
      url: string;
      publicId: string;
      thumbnailUrl: string;
      isSelected: boolean;
    }>;
    totalCount: number;
  } {
    const images = (this.imageUrls || []).map((url) => ({
      url,
      publicId: this.extractPublicId(url) || '',
      thumbnailUrl: this.generateThumbnailUrl(url),
      isSelected: url === this.thumbnailUrl,
    }));

    return {
      thumbnail: this.thumbnailUrl || null,
      images,
      totalCount: this.imageCount,
    };
  }

  /**
   * Extract Cloudinary public ID from URL
   */
  private extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+)\.[a-zA-Z]{3,4}$/);
    return match ? match[1] : null;
  }

  /**
   * Generate thumbnail URL with Cloudinary transformations
   */
  private generateThumbnailUrl(originalUrl: string): string {
    return originalUrl.replace('/upload/', '/upload/w_300,h_200,c_fill/');
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    url: string,
    transformation?: { width?: number; height?: number },
  ): string {
    if (!transformation?.width && !transformation?.height) {
      return url;
    }

    const { width = 800, height = 600 } = transformation;
    return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
  }

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

  @OneToMany(() => BudgetTrackingEntity, (budget) => budget.trip, {
    cascade: true,
  })
  budgetTracking: BudgetTrackingEntity[];
}
