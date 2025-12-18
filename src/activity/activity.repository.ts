import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityEntity } from 'src/schemas/activity.entity';
import { ActivityDestinationEntity } from 'src/schemas/activity-destination.entity';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
//

export interface ActivityListQuery {
  itineraryId?: string;
  tripId?: string;
}

@Injectable()
export class ActivityRepository {
  constructor(
    @InjectRepository(ActivityEntity)
    private readonly activityRepo: Repository<ActivityEntity>,
    @InjectRepository(ActivityDestinationEntity)
    private readonly mapRepo: Repository<ActivityDestinationEntity>,
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepo: Repository<ItineraryEntity>,
  ) {}

  async create(activity: Partial<ActivityEntity>): Promise<ActivityEntity> {
    const entity = this.activityRepo.create(activity);
    return this.activityRepo.save(entity);
  }

  async findById(id: string): Promise<ActivityEntity | null> {
    return this.activityRepo.findOne({ where: { id } });
  }

  async findOwnedActivityById(
    activityId: string,
    userId: string,
  ): Promise<ActivityEntity | null> {
    return this.activityRepo
      .createQueryBuilder('act')
      .innerJoin('act.itinerary', 'iti')
      .innerJoin('iti.trip', 'trip')
      .where('act.id = :activityId', { activityId })
      .andWhere('trip.userId = :userId', { userId })
      .getOne();
  }

  async list(query: ActivityListQuery): Promise<ActivityEntity[]> {
    const qb = this.activityRepo
      .createQueryBuilder('act')
      .leftJoinAndSelect('act.activityDestinations', 'ad')
      .leftJoinAndSelect('ad.destination', 'dest');
    if (query.itineraryId) {
      qb.andWhere('act.itineraryId = :itineraryId', {
        itineraryId: query.itineraryId,
      });
    }
    if (query.tripId) {
      qb.innerJoin('act.itinerary', 'iti').andWhere('iti.tripId = :tripId', {
        tripId: query.tripId,
      });
    }
    return qb
      .orderBy('act.orderIndex', 'ASC')
      .addOrderBy('act.time', 'ASC')
      .getMany();
  }

  async listForUser(
    userId: string,
    query: ActivityListQuery,
  ): Promise<ActivityEntity[]> {
    const qb = this.activityRepo
      .createQueryBuilder('act')
      .innerJoin('act.itinerary', 'iti')
      .innerJoin('iti.trip', 'trip')
      .leftJoinAndSelect('act.activityDestinations', 'ad')
      .leftJoinAndSelect('ad.destination', 'dest')
      .where('trip.userId = :userId', { userId });
    if (query.itineraryId)
      qb.andWhere('act.itineraryId = :itineraryId', {
        itineraryId: query.itineraryId,
      });
    if (query.tripId)
      qb.andWhere('iti.tripId = :tripId', { tripId: query.tripId });
    return qb
      .orderBy('act.orderIndex', 'ASC')
      .addOrderBy('act.time', 'ASC')
      .getMany();
  }

  async update(id: string, patch: Partial<ActivityEntity>): Promise<void> {
    await this.activityRepo.update(id, patch);
  }

  async remove(id: string): Promise<void> {
    await this.activityRepo.delete(id);
  }

  async replaceDestinationMappings(
    activityId: string,
    destinationIds: string[],
  ): Promise<void> {
    await this.mapRepo.delete({ activityId });
    if (destinationIds.length === 0) return;
    const rows = destinationIds.map((destId) =>
      this.mapRepo.create({ activityId, destinationId: destId }),
    );
    await this.mapRepo.insert(rows);
  }

  async itineraryBelongsToUser(
    itineraryId: string,
    userId: string,
  ): Promise<boolean> {
    const exists = await this.itineraryRepo
      .createQueryBuilder('iti')
      .innerJoin('iti.trip', 'trip')
      .where('iti.id = :itineraryId', { itineraryId })
      .andWhere('trip.userId = :userId', { userId })
      .getExists();
    return exists;
  }

  async findOwnedItineraryById(
    itineraryId: string,
    userId: string,
  ): Promise<ItineraryEntity | null> {
    return this.itineraryRepo
      .createQueryBuilder('iti')
      .innerJoin('iti.trip', 'trip')
      .where('iti.id = :itineraryId', { itineraryId })
      .andWhere('trip.userId = :userId', { userId })
      .getOne();
  }

  async activityOwnedByUser(
    activityId: string,
    userId: string,
  ): Promise<boolean> {
    const exists = await this.activityRepo
      .createQueryBuilder('act')
      .innerJoin('act.itinerary', 'iti')
      .innerJoin('iti.trip', 'trip')
      .where('act.id = :activityId', { activityId })
      .andWhere('trip.userId = :userId', { userId })
      .getExists();
    return exists;
  }

  /**
   * Bulk update activities - optimized for reorder/move operations
   * Returns the updated activity IDs
   */
  async bulkUpdate(
    items: Array<{
      id: string;
      itineraryId?: string;
      orderIndex?: number;
      time?: string;
      title?: string;
    }>,
  ): Promise<string[]> {
    return this.activityRepo.manager.transaction(async (manager) => {
      const actRepo = manager.getRepository(ActivityEntity);
      for (const item of items) {
        const patch: Partial<ActivityEntity> = {};
        if (item.itineraryId !== undefined)
          patch.itineraryId = item.itineraryId;
        if (item.orderIndex !== undefined) patch.orderIndex = item.orderIndex;
        if (item.time !== undefined) patch.time = item.time;
        if (item.title !== undefined) patch.title = item.title;
        if (Object.keys(patch).length > 0) {
          await actRepo.update(item.id, patch);
        }
      }
      return items.map((i) => i.id);
    });
  }

  /**
   * Check if multiple activities belong to user
   */
  async activitiesOwnedByUser(
    activityIds: string[],
    userId: string,
  ): Promise<boolean> {
    if (activityIds.length === 0) return true;
    const count = await this.activityRepo
      .createQueryBuilder('act')
      .innerJoin('act.itinerary', 'iti')
      .innerJoin('iti.trip', 'trip')
      .where('act.id IN (:...activityIds)', { activityIds })
      .andWhere('trip.userId = :userId', { userId })
      .getCount();
    return count === activityIds.length;
  }

  /**
   * Check if multiple itineraries belong to user
   */
  async itinerariesBelongToUser(
    itineraryIds: string[],
    userId: string,
  ): Promise<boolean> {
    if (itineraryIds.length === 0) return true;
    const count = await this.itineraryRepo
      .createQueryBuilder('iti')
      .innerJoin('iti.trip', 'trip')
      .where('iti.id IN (:...itineraryIds)', { itineraryIds })
      .andWhere('trip.userId = :userId', { userId })
      .getCount();
    return count === itineraryIds.length;
  }

  async bulkCreate(
    itineraryId: string,
    items: Array<
      Partial<ActivityEntity> & { destinationIds?: string[] | undefined }
    >,
  ): Promise<ActivityEntity[]> {
    return this.activityRepo.manager.transaction(async (manager) => {
      const actRepo = manager.getRepository(ActivityEntity);
      const mapRepo = manager.getRepository(ActivityDestinationEntity);

      const actEntities = items.map((i) =>
        actRepo.create({
          itineraryId,
          time: i.time!,
          title: i.title!,
          description: i.description,
          duration: i.duration ?? null,
          cost: i.cost ?? null,
          type: i.type ?? null,
          orderIndex: i.orderIndex ?? 0,
          poi: i.poi ?? null,
          metadata: i.metadata ?? null,
        }),
      );
      const saved = await actRepo.save(actEntities);
      const maps: ActivityDestinationEntity[] = [];
      saved.forEach((savedAct, idx) => {
        const destIds = items[idx].destinationIds || [];
        destIds.forEach((d) =>
          maps.push(
            mapRepo.create({ activityId: savedAct.id, destinationId: d }),
          ),
        );
      });
      if (maps.length) await mapRepo.insert(maps);
      return saved;
    });
  }
}
