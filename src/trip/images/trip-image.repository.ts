import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TripImageEntity } from '../../schemas/trip-image.entity';

@Injectable()
export class TripImageRepository {
  constructor(
    @InjectRepository(TripImageEntity)
    private readonly repo: Repository<TripImageEntity>,
  ) {}

  async findByTrip(tripId: string): Promise<TripImageEntity[]> {
    return this.repo.find({ where: { tripId }, order: { orderIndex: 'ASC' } });
  }

  async mapByPublicId(tripId: string): Promise<Map<string, TripImageEntity>> {
    const list = await this.findByTrip(tripId);
    return new Map(list.map((i) => [i.publicId, i]));
  }

  async insertImages(images: Partial<TripImageEntity>[]): Promise<void> {
    if (!images.length) return;
    await this.repo.insert(images);
  }

  async unsetAllThumbnails(tripId: string): Promise<void> {
    await this.repo.update(
      { tripId, isThumbnail: true },
      { isThumbnail: false },
    );
  }

  async setThumbnail(tripId: string, publicId: string): Promise<void> {
    await this.unsetAllThumbnails(tripId);
    await this.repo.update({ tripId, publicId }, { isThumbnail: true });
  }

  async reorder(tripId: string, order: string[]): Promise<void> {
    const now = Date.now();
    const cases: string[] = [];
    order.forEach((pid, idx) => {
      cases.push(`WHEN public_id='${pid.replace(/'/g, "''")}' THEN ${idx}`);
    });
    if (!cases.length) return;
    await this.repo.query(
      `UPDATE trip_images SET order_index = CASE ${cases.join(' ')} ELSE order_index END, updated_at = to_timestamp(${now}/1000.0) WHERE trip_id = $1`,
      [tripId],
    );
  }

  async deleteByPublicIds(tripId: string, publicIds: string[]): Promise<void> {
    if (!publicIds.length) return;
    await this.repo.delete({ tripId, publicId: In(publicIds) });
  }
}
