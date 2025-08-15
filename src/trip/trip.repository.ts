import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEntity } from '../schemas/trip.entity';

export interface ITripRepository {
  findById(id: string): Promise<TripEntity | null>;
  findByIdForUser(id: string, userId: string): Promise<TripEntity | null>;
  createTrip(data: Partial<TripEntity>): Promise<TripEntity>;
  updateTrip(id: string, data: Partial<TripEntity>): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  listByUser(
    userId: string,
    options: { skip: number; take: number; search?: string },
  ): Promise<{ items: TripEntity[]; total: number }>;
  listAll(options: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ items: TripEntity[]; total: number }>;
}

@Injectable()
export class TripRepository implements ITripRepository {
  constructor(
    @InjectRepository(TripEntity)
    private readonly repo: Repository<TripEntity>,
  ) {}

  async findById(id: string): Promise<TripEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<TripEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async createTrip(data: Partial<TripEntity>): Promise<TripEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async updateTrip(id: string, data: Partial<TripEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async deleteTrip(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async listByUser(
    userId: string,
    options: { skip: number; take: number; search?: string },
  ): Promise<{ items: TripEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId });

    if (options.search) {
      qb.andWhere('(trip.title ILIKE :q OR trip.description ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('trip.createdAt', 'DESC')
      .skip(options.skip)
      .take(options.take)
      .getManyAndCount();

    return { items, total };
  }

  async listAll(options: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ items: TripEntity[]; total: number }> {
    const qb = this.repo.createQueryBuilder('trip');

    if (options.search) {
      qb.where('(trip.title ILIKE :q OR trip.description ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('trip.createdAt', 'DESC')
      .skip(options.skip)
      .take(options.take)
      .getManyAndCount();

    return { items, total };
  }
}
