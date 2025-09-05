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

function diffDays(a: Date, b: Date): number {
  const ms = toDateOnly(a).getTime() - toDateOnly(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

@Injectable()
@ValidatorConstraint({ name: 'DateMatchesDayNumber', async: true })
export class DateMatchesDayNumberConstraint
  implements ValidatorConstraintInterface
{
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepo: Repository<TripEntity>,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (value == null || value === '') return true; // optional
    if (typeof value !== 'string' || value.trim() === '') return true; // optional
    const dateStr = value;
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr)) {
      return false;
    }
    const obj = args.object as Record<string, unknown>;
    const tripId = (obj?.['tripId'] as string) ?? undefined;
    const dayNumber = (obj?.['dayNumber'] as number) ?? undefined;
    if (!tripId || !dayNumber) return true; // other validators enforce these

    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip || !trip.startDate) return true; // nothing to compare against

    const start = toDateOnly(trip.startDate);
    const date = toDateOnly(dateStr);

    // dayNumber is 1-based, so diff must be dayNumber-1
    const expectedOffset = dayNumber - 1;
    const actualOffset = diffDays(date, start);
    if (actualOffset !== expectedOffset) return false;

    if (trip.endDate) {
      const end = toDateOnly(trip.endDate);
      // Also ensure dayNumber within range length
      const maxDays = diffDays(end, start) + 1;
      if (dayNumber < 1 || dayNumber > maxDays) return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'Date does not match day number and startDate of the trip.';
  }
}
