import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Vietnam location entity for administrative divisions (provinces, districts, wards)
 */
@Entity('vietnam_locations')
@Index(['provinceId', 'districtId', 'wardId'])
@Index(['provinceName'])
@Index(['coordinates'])
export class VietnamLocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'province_id', type: 'integer', nullable: true })
  provinceId?: number;

  @Column({ name: 'district_id', type: 'integer', nullable: true })
  districtId?: number;

  @Column({ name: 'ward_id', type: 'integer', nullable: true })
  wardId?: number;

  @Column({ name: 'province_name', length: 255 })
  provinceName: string;

  @Column({ name: 'district_name', length: 255, nullable: true })
  districtName?: string;

  @Column({ name: 'ward_name', length: 255, nullable: true })
  wardName?: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  coordinates?: string;

  @Column({ length: 10, nullable: true })
  type?: string; // 'tinh', 'thanh-pho', 'quan', 'huyen', 'xa', 'phuong', 'thi-tran'

  @Column({ length: 50, nullable: true })
  slug?: string;

  @Column({ name: 'name_with_type', length: 255, nullable: true })
  nameWithType?: string;

  @Column({ type: 'text', nullable: true })
  path?: string;

  @Column({ name: 'path_with_type', type: 'text', nullable: true })
  pathWithType?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
