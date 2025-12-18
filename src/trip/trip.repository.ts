import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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
      sortBy?:
        | 'createdAt'
        | 'startDate'
        | 'endDate'
        | 'title'
        | 'status'
        | 'budget';
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
    sortBy?:
      | 'createdAt'
      | 'startDate'
      | 'endDate'
      | 'title'
      | 'status'
      | 'budget';
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
    const qb = this.repo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.primaryDestination', 'primaryDestination');
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
    const qb = this.repo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.primaryDestination', 'primaryDestination')
      .leftJoinAndSelect('trip.images', 'images')
      .leftJoinAndSelect('trip.itinerary', 'itinerary')
      .leftJoinAndSelect('itinerary.activities', 'activities')
      .leftJoinAndSelect('trip.budgetTracking', 'budgetTracking')
      .leftJoinAndSelect('trip.members', 'members')
      .where('trip.id = :id', { id })
      .andWhere(
        new Brackets((sqb) =>
          sqb
            .where('trip.userId = :userId', { userId })
            .orWhere('members.userId = :userId', { userId }),
        ),
      )
      .orderBy('itinerary.dayNumber', 'ASC')
      .addOrderBy('activities.orderIndex', 'ASC')
      .addOrderBy('activities.time', 'ASC');

    return qb.getOne();
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
      sortBy?:
        | 'createdAt'
        | 'startDate'
        | 'endDate'
        | 'title'
        | 'status'
        | 'budget';
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ items: TripEntity[]; total: number }> {
    const baseQb = this.repo
      .createQueryBuilder('trip')
      .leftJoin('trip.members', 'members')
      .where(
        new Brackets((sqb) =>
          sqb
            .where('trip.userId = :userId', { userId })
            .orWhere('members.userId = :userId', { userId }),
        ),
      );

    if (options.search) {
      baseQb.andWhere('(trip.title ILIKE :q OR trip.description ILIKE :q)', {
        q: `%${options.search}%`,
      });
    }
    if (options.status) {
      baseQb.andWhere('trip.status = :status', { status: options.status });
    }
    if (options.startDateFrom) {
      baseQb.andWhere('trip.startDate >= :startDateFrom', {
        startDateFrom: options.startDateFrom,
      });
    }
    if (options.startDateTo) {
      baseQb.andWhere('trip.startDate <= :startDateTo', {
        startDateTo: options.startDateTo,
      });
    }
    if (options.endDateFrom) {
      baseQb.andWhere('trip.endDate >= :endDateFrom', {
        endDateFrom: options.endDateFrom,
      });
    }
    if (options.endDateTo) {
      baseQb.andWhere('trip.endDate <= :endDateTo', {
        endDateTo: options.endDateTo,
      });
    }

    const allowed: Record<string, string> = {
      createdAt: 'trip.createdAt',
      startDate: 'trip.startDate',
      endDate: 'trip.endDate',
      title: 'trip.title',
      status: 'trip.status',
      budget: 'trip.budget',
    };
    const orderField = options.sortBy ? allowed[options.sortBy] : undefined;

    // First query: get paginated trip ids
    const idsQb = baseQb.clone().select('trip.id', 'id').distinct(true);

    // Ensure ORDER BY fields are present in select list for DISTINCT
    const primaryOrder = orderField ?? 'trip.createdAt';
    idsQb.addSelect(primaryOrder, 'order_value');

    idsQb
      .orderBy(primaryOrder, options.sortOrder)
      .addOrderBy('trip.id', 'ASC')
      .skip(options.skip)
      .take(options.take);
    const idRows = await idsQb.getRawMany<{ id: string }>();
    const ids = idRows.map((r) => r.id);

    // Count separately to avoid DISTINCT ON with json fields
    const countRow = await baseQb
      .clone()
      .select('COUNT(DISTINCT trip.id)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const total = Number(countRow?.cnt ?? 0);

    if (ids.length === 0) return { items: [], total };

    // Second query: fetch full rows for the page
    const dataQb = this.repo
      .createQueryBuilder('trip')
      .select([
        'trip.id',
        'trip.title',
        'trip.description',
        'trip.startDate',
        'trip.endDate',
        'trip.status',
        'trip.budget',
        'trip.currency',
        'trip.isPublic',
        'trip.enableCostTracking',
        'trip.createdAt',
        'trip.updatedAt',
      ])
      .leftJoinAndSelect('trip.primaryDestination', 'primaryDestination')
      .leftJoinAndSelect(
        'trip.images',
        'images',
        'images.isThumbnail = :isThumb',
        { isThumb: true },
      )
      .where('trip.id IN (:...ids)', { ids })
      .orderBy(orderField ?? 'trip.createdAt', options.sortOrder)
      .addOrderBy('trip.id', 'ASC');

    const items = await dataQb.getMany();

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
    sortBy?:
      | 'createdAt'
      | 'startDate'
      | 'endDate'
      | 'title'
      | 'status'
      | 'budget';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ items: TripEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('trip')
      // Only select essential admin fields (no itinerary, budget tracking, members)
      .select([
        'trip.id',
        'trip.title',
        'trip.description',
        'trip.startDate',
        'trip.endDate',
        'trip.status',
        'trip.budget',
        'trip.currency',
        'trip.isPublic',
        'trip.enableCostTracking',
        'trip.userId',
        'trip.createdAt',
        'trip.updatedAt',
      ])
      .leftJoinAndSelect('trip.primaryDestination', 'primaryDestination')
      // Only select thumbnail image
      .leftJoinAndSelect(
        'trip.images',
        'images',
        'images.isThumbnail = :isThumb',
        { isThumb: true },
      )
      // Join user for owner info
      .leftJoin('trip.user', 'user')
      .addSelect(['user.firstName', 'user.lastName', 'user.email']);

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
      budget: 'trip.budget',
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
