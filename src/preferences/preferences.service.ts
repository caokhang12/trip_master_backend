import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferencesEntity } from 'src/schemas/user-preferences.entity';
import { TripPreferencesEntity } from 'src/schemas/trip-preferences.entity';
import { TripEntity } from 'src/schemas/trip.entity';
import { TravelStyle } from 'src/shared/types/base-response.types';

export interface BudgetRangeDtoLike {
  min: number;
  max: number;
  currency: string;
}

export interface UpdateUserPreferencesInput {
  travelStyle?: TravelStyle[];
  budgetRange?: BudgetRangeDtoLike;
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
}

export interface UpdateTripPreferencesInput {
  inferredStyle?: TravelStyle[];
  dominantActivities?: string[];
  foodStyle?: string[];
  weatherAdjustedPreferences?: Record<string, unknown>;
  customPreferences?: Record<string, unknown>;
}

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferencesEntity)
    private readonly userPrefsRepo: Repository<UserPreferencesEntity>,
    @InjectRepository(TripPreferencesEntity)
    private readonly tripPrefsRepo: Repository<TripPreferencesEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepo: Repository<TripEntity>,
  ) {}

  // USER PREFERENCES (long-term, master)
  async getUserPreferences(
    userId: string,
  ): Promise<UserPreferencesEntity | null> {
    return this.userPrefsRepo.findOne({ where: { userId } });
  }

  async upsertUserPreferences(
    userId: string,
    input: UpdateUserPreferencesInput,
  ): Promise<UserPreferencesEntity> {
    const existing = await this.userPrefsRepo.findOne({ where: { userId } });
    const toSave = existing
      ? { ...existing, ...input, userId }
      : this.userPrefsRepo.create({ userId, ...input });
    return this.userPrefsRepo.save(toSave);
  }

  // TRIP PREFERENCES (per-trip, dynamic)
  async getTripPreferences(
    tripId: string,
    requesterUserId: string,
  ): Promise<TripPreferencesEntity | null> {
    await this.ensureTripOwnership(tripId, requesterUserId);
    return this.tripPrefsRepo.findOne({ where: { tripId } });
  }

  async upsertTripPreferences(
    tripId: string,
    requesterUserId: string,
    input: UpdateTripPreferencesInput,
  ): Promise<TripPreferencesEntity> {
    await this.ensureTripOwnership(tripId, requesterUserId);
    const existing = await this.tripPrefsRepo.findOne({ where: { tripId } });
    const toSave = existing
      ? { ...existing, ...input, tripId }
      : this.tripPrefsRepo.create({ tripId, ...input });
    return this.tripPrefsRepo.save(toSave);
  }

  // Helper: ensure the current user owns the trip
  private async ensureTripOwnership(
    tripId: string,
    requesterUserId: string,
  ): Promise<void> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.userId !== requesterUserId)
      throw new ForbiddenException('You do not have access to this trip');
  }
}
