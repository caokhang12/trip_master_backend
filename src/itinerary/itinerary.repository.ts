import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
import { TripEntity } from 'src/schemas/trip.entity';

@Injectable()
export class ItineraryRepository {
  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly repo: Repository<ItineraryEntity>,
  ) {}

  async create(data: Partial<ItineraryEntity>): Promise<ItineraryEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<ItineraryEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<ItineraryEntity | null> {
    return this.repo
      .createQueryBuilder('iti')
      .innerJoin('iti.trip', 'trip')
      .where('iti.id = :id', { id })
      .andWhere('trip.userId = :userId', { userId })
      .getOne();
  }

  async listForUser(
    userId: string,
    tripId?: string,
  ): Promise<ItineraryEntity[]> {
    const qb = this.repo
      .createQueryBuilder('iti')
      .innerJoin('iti.trip', 'trip')
      .where('trip.userId = :userId', { userId });
    if (tripId) qb.andWhere('iti.tripId = :tripId', { tripId });
    return qb.orderBy('iti.dayNumber', 'ASC').getMany();
  }

  async update(id: string, patch: Partial<ItineraryEntity>): Promise<void> {
    await this.repo.update(id, patch);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async tripOwnedByUser(tripId: string, userId: string): Promise<boolean> {
    const exists = await this.repo.manager
      .getRepository(TripEntity)
      .createQueryBuilder('trip')
      .where('trip.id = :tripId', { tripId })
      .andWhere('trip.userId = :userId', { userId })
      .getExists();
    return exists;
  }

  async getTripById(tripId: string) {
    return this.repo.manager
      .getRepository(TripEntity)
      .findOne({ where: { id: tripId } });
  }
}
