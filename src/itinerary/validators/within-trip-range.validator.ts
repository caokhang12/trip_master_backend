import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Repository } from 'typeorm';
import { TripEntity } from 'src/schemas/trip.entity';

function toDateOnly(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Injectable()
@ValidatorConstraint({ name: 'WithinTripRange', async: true })
export class WithinTripRangeConstraint implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepo: Repository<TripEntity>,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (typeof value !== 'string' || value.trim() === '') return true; // optional
    const dateStr = value;
    // Basic YYYY-MM-DD format check to avoid invalid Date
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr)) {
      return false;
    }

    const obj = args.object as Record<string, unknown>;
    const tripId = (obj?.['tripId'] as string) ?? undefined;
    if (!tripId) return true; // tripId validator handles requiredness

    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) return true; // Ownership/exists check is handled elsewhere

    const date = toDateOnly(dateStr);
    if (trip.startDate) {
      const start = toDateOnly(trip.startDate);
      if (date < start) return false;
    }
    if (trip.endDate) {
      const end = toDateOnly(trip.endDate);
      if (date > end) return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'Date must be within the trip range.';
  }
}
