import { Request } from 'express';
import { TripEntity } from '../../schemas/trip.entity';
import { ItineraryEntity } from '../../schemas/itinerary.entity';
import { TripShareEntity } from '../../schemas/trip-share.entity';

/**
 * Authenticated request interface with user information
 */
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Trip with complete itinerary details
 */
export interface TripDetails extends TripEntity {
  itinerary: ItineraryEntity[];
  shareInfo?: TripShareEntity;
}

/**
 * Itinerary with cost tracking information
 */
export interface ItineraryWithCosts extends ItineraryEntity {
  activities: ActivityWithCosts[];
  totalCost?: number;
  costBreakdown?: {
    accommodation?: number;
    food?: number;
    transport?: number;
    activities?: number;
    others?: number;
  };
  budgetStatus?: 'under' | 'on' | 'over';
}

/**
 * Activity with cost information
 */
export interface ActivityWithCosts {
  time: string;
  title: string;
  description?: string;
  location?: string;
  duration?: number;
  type?: string;
  cost?: number;
  estimatedCost?: number;
  actualCost?: number;
  costCategory?: string;
  costEstimate?: any; // ActivityCostDto - using any to avoid circular dependency
  notes?: string;
}
