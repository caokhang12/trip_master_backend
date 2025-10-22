import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEntity } from '../schemas/trip.entity';
import { TripStatus } from './enum/trip-enum';

export interface ITripRepository {
  findById(id: string): Promise<TripEntity | null>;
  findByIdForUser(id: string, userId: string): Promise<TripEntity | null>;
  createTrip(data: Partial<TripEntity>): Promise<TripEntity>;
  updateTrip(id: string, data: Partial<TripEntity>): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  listByUser(
    userId: string,
    options: {
      skip: number;
      take: number;
      search?: string;
      status?: TripStatus;
      startDateFrom?: Date;
      startDateTo?: Date;
      endDateFrom?: Date;
      endDateTo?: Date;
      sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status';
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ items: TripEntity[]; total: number }>;
  listAll(options: {
    skip: number;
    take: number;
    search?: string;
    status?: TripStatus;
    startDateFrom?: Date;
    startDateTo?: Date;
    endDateFrom?: Date;
    endDateTo?: Date;
    sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ items: TripEntity[]; total: number }>;
}

@Injectable()
export class TripRepository implements ITripRepository {
  constructor(
    @InjectRepository(TripEntity)
    private readonly repo: Repository<TripEntity>,
  ) {}

  async findById(id: string): Promise<TripEntity | null> {
    const qb = this.repo.createQueryBuilder('trip');
    return qb
      .where('trip.id = :id', { id })
      .leftJoinAndSelect('trip.user', 'user')
      .addSelect(['user.firstName', 'user.lastName'])
      .getOne();
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
    options: {
      skip: number;
      take: number;
      search?: string;
      status?: TripStatus;
      startDateFrom?: Date;
      startDateTo?: Date;
      endDateFrom?: Date;
      endDateTo?: Date;
      sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status';
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ items: TripEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('trip')
      // Only join the thumbnail image to avoid loading all images
      .leftJoinAndSelect(
        'trip.images',
        'images',
        'images.isThumbnail = :isThumb',
        { isThumb: true },
      )
      .where('trip.userId = :userId', { userId });

    if (options.search) {
      qb.andWhere('(trip.title ILIKE :q OR trip.description ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }
    if (options.status) {
      qb.andWhere('trip.status = :status', { status: options.status });
    }
    if (options.startDateFrom) {
      qb.andWhere('trip.startDate >= :startDateFrom', {
        startDateFrom: options.startDateFrom,
      });
    }
    if (options.startDateTo) {
      qb.andWhere('trip.startDate <= :startDateTo', {
        startDateTo: options.startDateTo,
      });
    }
    if (options.endDateFrom) {
      qb.andWhere('trip.endDate >= :endDateFrom', {
        endDateFrom: options.endDateFrom,
      });
    }
    if (options.endDateTo) {
      qb.andWhere('trip.endDate <= :endDateTo', {
        endDateTo: options.endDateTo,
      });
    }

    const allowed: Record<string, string> = {
      createdAt: 'trip.createdAt',
      startDate: 'trip.startDate',
      endDate: 'trip.endDate',
      title: 'trip.title',
      status: 'trip.status',
    };
    const orderField = options.sortBy ? allowed[options.sortBy] : undefined;

    const [items, total] = await qb
      .orderBy(orderField ?? 'trip.createdAt', options.sortOrder)

      .skip(options.skip)
      .take(options.take)
      .getManyAndCount();

    return { items, total };
  }

  async listAll(options: {
    skip: number;
    take: number;
    search?: string;
    status?: TripStatus;
    startDateFrom?: Date;
    startDateTo?: Date;
    endDateFrom?: Date;
    endDateTo?: Date;
    sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ items: TripEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('trip')
      // Only join the thumbnail image to avoid loading all images
      .leftJoinAndSelect(
        'trip.images',
        'images',
        'images.isThumbnail = :isThumb',
        { isThumb: true },
      )
      // Join user to expose first/last name for admin listing
      .leftJoin('trip.user', 'user')
      .addSelect(['user.firstName', 'user.lastName']);

    if (options.search) {
      qb.where('(trip.title ILIKE :q OR trip.description ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }
    if (options.status) {
      qb.andWhere('trip.status = :status', { status: options.status });
    }
    if (options.startDateFrom) {
      qb.andWhere('trip.startDate >= :startDateFrom', {
        startDateFrom: options.startDateFrom,
      });
    }
    if (options.startDateTo) {
      qb.andWhere('trip.startDate <= :startDateTo', {
        startDateTo: options.startDateTo,
      });
    }
    if (options.endDateFrom) {
      qb.andWhere('trip.endDate >= :endDateFrom', {
        endDateFrom: options.endDateFrom,
      });
    }
    if (options.endDateTo) {
      qb.andWhere('trip.endDate <= :endDateTo', {
        endDateTo: options.endDateTo,
      });
    }

    const allowed: Record<string, string> = {
      createdAt: 'trip.createdAt',
      startDate: 'trip.startDate',
      endDate: 'trip.endDate',
      title: 'trip.title',
      status: 'trip.status',
    };
    const orderField = options.sortBy ? allowed[options.sortBy] : undefined;

    const [items, total] = await qb
      .orderBy(orderField ?? 'trip.createdAt', options.sortOrder)
      .skip(options.skip)
      .take(options.take)
      .getManyAndCount();

    return { items, total };
  }
}
