import { Injectable, NotFoundException } from '@nestjs/common';
import { TripEntity } from '../schemas/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import {
  PaginationHelper,
  PaginationResult,
} from '../shared/types/pagination.types';
import { TripStatus } from './enum/trip-enum';
import { TripRepository } from './trip.repository';

@Injectable()
export class TripService {
  constructor(private readonly tripRepo: TripRepository) {}

  async create(userId: string, dto: CreateTripDto): Promise<TripEntity> {
    const entity = await this.tripRepo.createTrip({
      userId,
      title: dto.title,
      description: dto.description,
      timezone: dto.timezone,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      budget: dto.budget,
      currency: dto.currency ?? 'USD',
      status: dto.status ?? TripStatus.PLANNING,
      isPublic: dto.isPublic ?? false,
      enableCostTracking: dto.enableCostTracking ?? true,
      imageUrls: dto.imageUrls ?? [],
      thumbnailUrl: dto.thumbnailUrl,
    });
    return entity;
  }

  async findOneForUser(id: string, userId: string): Promise<TripEntity> {
    const found = await this.tripRepo.findByIdForUser(id, userId);
    if (!found) throw new NotFoundException('Trip not found');
    return found;
  }

  async findOneAdmin(id: string): Promise<TripEntity> {
    const found = await this.tripRepo.findById(id);
    if (!found) throw new NotFoundException('Trip not found');
    return found;
  }

  async updateForUser(
    id: string,
    userId: string,
    dto: UpdateTripDto,
  ): Promise<TripEntity> {
    const existing = await this.findOneForUser(id, userId);

    const patched: Partial<TripEntity> = {
      ...existing,
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
    };
    await this.tripRepo.updateTrip(id, patched);
    return (await this.tripRepo.findById(id))!;
  }

  async updateAdmin(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const existing = await this.findOneAdmin(id);

    const patched: Partial<TripEntity> = {
      ...existing,
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
    };
    await this.tripRepo.updateTrip(id, patched);
    return (await this.tripRepo.findById(id))!;
  }

  async removeForUser(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(id, userId);
    await this.tripRepo.deleteTrip(existing.id);
  }

  async removeAdmin(id: string): Promise<void> {
    const existing = await this.findOneAdmin(id);
    await this.tripRepo.deleteTrip(existing.id);
  }

  async listForUser(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginationResult<TripEntity>> {
    const { skip, limit: take } = PaginationHelper.validateParams(page, limit);
    const { items, total } = await this.tripRepo.listByUser(userId, {
      skip,
      take,
      search,
    });
    return PaginationHelper.createResult(items, total, page, take);
  }

  async listAll(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginationResult<TripEntity>> {
    const { skip, limit: take } = PaginationHelper.validateParams(page, limit);
    const { items, total } = await this.tripRepo.listAll({
      skip,
      take,
      search,
    });
    return PaginationHelper.createResult(items, total, page, take);
  }
}
