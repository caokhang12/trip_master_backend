import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TripEntity } from '../../schemas/trip.entity';

/**
 * Utility service for common trip validation operations
 */
@Injectable()
export class TripValidationUtil {
  /**
   * Validate trip ownership and existence
   * @param tripRepository - Trip repository instance
   * @param tripId - Trip ID to validate
   * @param userId - User ID to check ownership
   * @param throwNotFound - Whether to throw NotFoundException (default: BadRequestException)
   * @returns Trip entity if valid
   * @throws BadRequestException or NotFoundException if invalid
   */
  static async validateTripOwnership(
    tripRepository: Repository<TripEntity>,
    tripId: string,
    userId: string,
    throwNotFound: boolean = false,
  ): Promise<TripEntity> {
    const trip = await tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      const errorMessage = 'Trip not found or access denied';
      if (throwNotFound) {
        throw new NotFoundException(errorMessage);
      } else {
        throw new BadRequestException(errorMessage);
      }
    }

    return trip;
  }

  /**
   * Validate trip ownership with relations
   * @param tripRepository - Trip repository instance
   * @param tripId - Trip ID to validate
   * @param userId - User ID to check ownership
   * @param relations - Relations to include in the query
   * @param throwNotFound - Whether to throw NotFoundException
   * @returns Trip entity with relations if valid
   */
  static async validateTripOwnershipWithRelations(
    tripRepository: Repository<TripEntity>,
    tripId: string,
    userId: string,
    relations: string[] = [],
    throwNotFound: boolean = false,
  ): Promise<TripEntity> {
    const trip = await tripRepository.findOne({
      where: { id: tripId, userId },
      relations,
    });

    if (!trip) {
      const errorMessage = 'Trip not found or access denied';
      if (throwNotFound) {
        throw new NotFoundException(errorMessage);
      } else {
        throw new BadRequestException(errorMessage);
      }
    }

    return trip;
  }

  /**
   * Validate trip exists without ownership check (for public access)
   * @param tripRepository - Trip repository instance
   * @param tripId - Trip ID to validate
   * @param relations - Relations to include in the query
   * @returns Trip entity if exists
   * @throws NotFoundException if not found
   */
  static async validateTripExists(
    tripRepository: Repository<TripEntity>,
    tripId: string,
    relations: string[] = [],
  ): Promise<TripEntity> {
    const trip = await tripRepository.findOne({
      where: { id: tripId },
      relations,
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  /**
   * Validate trip dates for itinerary generation
   * @param trip - Trip entity to validate
   * @throws BadRequestException if dates are missing
   */
  static validateTripDates(trip: TripEntity): void {
    if (!trip.startDate || !trip.endDate) {
      throw new BadRequestException(
        'Trip must have start and end dates for itinerary generation',
      );
    }

    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Trip start date must be before end date');
    }

    const maxDays = 30; // Maximum trip duration for itinerary generation
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new BadRequestException(
        `Trip duration cannot exceed ${maxDays} days for itinerary generation`,
      );
    }
  }

  /**
   * Validate trip has required fields for operation
   * @param trip - Trip entity to validate
   * @param requiredFields - Array of required field names
   * @throws BadRequestException if required fields are missing
   */
  static validateRequiredFields(
    trip: TripEntity,
    requiredFields: string[],
  ): void {
    const missingFields = requiredFields.filter((field) => {
      const value = trip[field as keyof TripEntity];
      return (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
      );
    });

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }
  }
}
