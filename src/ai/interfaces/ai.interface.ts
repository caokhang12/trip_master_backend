/**
 * AI-related interfaces for TripMaster backend
 */

import { ActivityCategory } from 'src/trip/enum/enum';

export interface AIGenerationRequest {
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelers: number;
  preferences: UserTravelPreferences;
  accommodationLocation?: string;
}

export interface UserTravelPreferences {
  travelStyle:
    | 'budget'
    | 'mid-range'
    | 'luxury'
    | 'backpacker'
    | 'family'
    | 'romantic'
    | 'adventure'
    | 'cultural';
  interests: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  transportPreference?:
    | 'walking'
    | 'public-transport'
    | 'motorbike'
    | 'car'
    | 'mixed';
  activityLevel?: 'low' | 'moderate' | 'high';
  groupType?:
    | 'solo'
    | 'couple'
    | 'family'
    | 'friends'
    | 'business'
    | 'romantic';
}

export interface GeneratedItinerary {
  days: DayItinerary[];
  summary: ItinerarySummary;
  culturalContext?: CulturalContext;
  totalEstimatedCost: number;
  currency: string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  activities: ActivityRecommendation[];
  dailyBudget: number;
  transportationNotes?: string;
  culturalTips?: string[];
}

export interface ActivityRecommendation {
  name: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  duration: number; // in minutes
  estimatedCost: number;
  category: ActivityCategory;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'full-day';
  culturalSignificance?: string;
  localTips?: string[];
  bookingRequired?: boolean;
  seasonalAvailability?: string;
}

export interface ItinerarySummary {
  totalDays: number;
  highlights: string[];
  budgetBreakdown: BudgetBreakdown;
  bestTimeToVisit?: string;
  packingRecommendations?: string[];
  culturalEtiquette?: string[];
}

export interface BudgetBreakdown {
  accommodation: number;
  food: number;
  activities: number;
  transportation: number;
  shopping: number;
  miscellaneous: number;
  total: number;
}

export interface CulturalContext {
  country: string;
  language: string;
  currency: string;
  tipping: string;
  customsAndTraditions: string[];
  localEtiquette: string[];
  seasonalConsiderations: string[];
  safetyTips: string[];
  emergencyContacts?: EmergencyContact[];
}

export interface EmergencyContact {
  service: string;
  number: string;
  description: string;
}

export interface PromptContext {
  country: string;
  season?: string;
  region?: string;
  culturalContext?: string;
  budgetGuidelines?: string;
  localExpertise?: string;
}

export interface AIUsageMetrics {
  userId: string;
  tokensUsed: number;
  requestType: string;
  cost: number;
  timestamp: Date;
  success: boolean;
}

export interface CountryMetadata {
  code: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
  costMultiplier: number;
  culturalTips: string[];
  seasonalInfo: SeasonalInfo[];
}

export interface SeasonalInfo {
  months: number[];
  weather: string;
  temperature: string;
  rainfall: string;
  crowdLevel: 'low' | 'medium' | 'high';
  priceLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  warnings?: string[];
}
