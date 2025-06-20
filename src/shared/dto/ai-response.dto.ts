import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordinatesDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 10.8231,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 106.6297,
  })
  longitude: number;
}

export class ActivityRecommendationDto {
  @ApiProperty({
    description: 'Activity name',
    example: 'Ben Thanh Market',
  })
  name: string;

  @ApiProperty({
    description: 'Activity description',
    example:
      'Historic market with local food, souvenirs, and cultural experience',
  })
  description: string;

  @ApiProperty({
    description: 'Activity location',
    example: 'District 1, Ho Chi Minh City',
  })
  location: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates',
    type: CoordinatesDto,
  })
  coordinates?: CoordinatesDto;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 120,
  })
  duration: number;

  @ApiProperty({
    description: 'Estimated cost in local currency',
    example: 200000,
  })
  estimatedCost: number;

  @ApiProperty({
    description: 'Activity category',
    example: 'shopping',
  })
  category: string;

  @ApiProperty({
    description: 'Time slot recommendation',
    enum: ['morning', 'afternoon', 'evening', 'full-day'],
    example: 'afternoon',
  })
  timeSlot: string;

  @ApiPropertyOptional({
    description: 'Cultural significance',
    example:
      'Important traditional market representing Vietnamese commerce culture',
  })
  culturalSignificance?: string;

  @ApiPropertyOptional({
    description: 'Local tips',
    type: [String],
    example: [
      'Bargain politely',
      'Try the local street food',
      'Visit early morning for best selection',
    ],
  })
  localTips?: string[];

  @ApiPropertyOptional({
    description: 'Whether booking is required',
    example: false,
  })
  bookingRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Seasonal availability notes',
    example: 'Open year-round, best visited during dry season',
  })
  seasonalAvailability?: string;
}

export class BudgetBreakdownDto {
  @ApiProperty({
    description: 'Accommodation costs',
    example: 1500000,
  })
  accommodation: number;

  @ApiProperty({
    description: 'Food and dining costs',
    example: 800000,
  })
  food: number;

  @ApiProperty({
    description: 'Activities and attractions costs',
    example: 600000,
  })
  activities: number;

  @ApiProperty({
    description: 'Transportation costs',
    example: 300000,
  })
  transportation: number;

  @ApiProperty({
    description: 'Shopping budget',
    example: 500000,
  })
  shopping: number;

  @ApiProperty({
    description: 'Miscellaneous expenses',
    example: 200000,
  })
  miscellaneous: number;

  @ApiProperty({
    description: 'Total estimated cost',
    example: 3900000,
  })
  total: number;
}

export class ItinerarySummaryDto {
  @ApiProperty({
    description: 'Total number of days',
    example: 5,
  })
  totalDays: number;

  @ApiProperty({
    description: 'Trip highlights',
    type: [String],
    example: [
      'Explore historic Cu Chi Tunnels',
      'Street food tour in District 1',
      'Mekong Delta day trip',
    ],
  })
  highlights: string[];

  @ApiProperty({
    description: 'Budget breakdown',
    type: BudgetBreakdownDto,
  })
  budgetBreakdown: BudgetBreakdownDto;

  @ApiPropertyOptional({
    description: 'Best time to visit',
    example: 'December to March (dry season)',
  })
  bestTimeToVisit?: string;

  @ApiPropertyOptional({
    description: 'Packing recommendations',
    type: [String],
    example: [
      'Light cotton clothing',
      'Comfortable walking shoes',
      'Rain jacket (if rainy season)',
      'Sunscreen and hat',
    ],
  })
  packingRecommendations?: string[];

  @ApiPropertyOptional({
    description: 'Cultural etiquette tips',
    type: [String],
    example: [
      'Remove shoes when entering homes and temples',
      'Dress modestly in religious sites',
      'Use both hands when giving/receiving items',
    ],
  })
  culturalEtiquette?: string[];
}

export class EmergencyContactDto {
  @ApiProperty({
    description: 'Emergency service name',
    example: 'Police',
  })
  service: string;

  @ApiProperty({
    description: 'Contact number',
    example: '113',
  })
  number: string;

  @ApiProperty({
    description: 'Service description',
    example: 'Emergency police assistance',
  })
  description: string;
}

export class CulturalContextDto {
  @ApiProperty({
    description: 'Country name',
    example: 'Vietnam',
  })
  country: string;

  @ApiProperty({
    description: 'Primary language',
    example: 'Vietnamese',
  })
  language: string;

  @ApiProperty({
    description: 'Local currency',
    example: 'Vietnamese Dong (VND)',
  })
  currency: string;

  @ApiProperty({
    description: 'Tipping customs',
    example: 'Tipping is not mandatory but appreciated, 5-10% in restaurants',
  })
  tipping: string;

  @ApiProperty({
    description: 'Customs and traditions',
    type: [String],
    example: [
      'Tet (Lunar New Year) is the most important holiday',
      'Ancestor worship is central to Vietnamese culture',
      'Family values are highly important',
    ],
  })
  customsAndTraditions: string[];

  @ApiProperty({
    description: 'Local etiquette guidelines',
    type: [String],
    example: [
      'Greet with a slight bow or handshake',
      'Avoid pointing with your finger',
      'Be respectful in temples and pagodas',
    ],
  })
  localEtiquette: string[];

  @ApiProperty({
    description: 'Seasonal considerations',
    type: [String],
    example: [
      'Dry season (Nov-Apr) is best for travel',
      'Rainy season (May-Oct) brings heavy rainfall',
      'Tet holiday (Jan/Feb) affects business hours',
    ],
  })
  seasonalConsiderations: string[];

  @ApiProperty({
    description: 'Safety tips',
    type: [String],
    example: [
      'Be cautious of traffic when crossing streets',
      'Keep valuables secure in crowded areas',
      'Drink bottled or filtered water',
    ],
  })
  safetyTips: string[];

  @ApiPropertyOptional({
    description: 'Emergency contacts',
    type: [EmergencyContactDto],
  })
  emergencyContacts?: EmergencyContactDto[];
}

export class DayItineraryDto {
  @ApiProperty({
    description: 'Day number in the trip',
    example: 1,
  })
  dayNumber: number;

  @ApiProperty({
    description: 'Date of the day',
    example: '2024-03-15',
  })
  date: string;

  @ApiProperty({
    description: 'Activities for the day',
    type: [ActivityRecommendationDto],
  })
  activities: ActivityRecommendationDto[];

  @ApiProperty({
    description: 'Estimated daily budget',
    example: 780000,
  })
  dailyBudget: number;

  @ApiPropertyOptional({
    description: 'Transportation notes',
    example:
      'Use Grab or taxi between locations, walking distance between market areas',
  })
  transportationNotes?: string;

  @ApiPropertyOptional({
    description: 'Cultural tips for the day',
    type: [String],
    example: [
      'Early morning is best for market visits',
      'Lunch break from 12-1 PM is common',
    ],
  })
  culturalTips?: string[];
}

export class GeneratedItineraryDto {
  @ApiProperty({
    description: 'Daily itineraries',
    type: [DayItineraryDto],
  })
  days: DayItineraryDto[];

  @ApiProperty({
    description: 'Trip summary',
    type: ItinerarySummaryDto,
  })
  summary: ItinerarySummaryDto;

  @ApiPropertyOptional({
    description: 'Cultural context information',
    type: CulturalContextDto,
  })
  culturalContext?: CulturalContextDto;

  @ApiProperty({
    description: 'Total estimated cost',
    example: 3900000,
  })
  totalEstimatedCost: number;

  @ApiProperty({
    description: 'Currency used for costs',
    example: 'VND',
  })
  currency: string;
}

export class LocationSuggestionDto {
  @ApiProperty({
    description: 'Suggested activity or location name',
    example: 'War Remnants Museum',
  })
  name: string;

  @ApiProperty({
    description: 'Activity description',
    example: 'Educational museum showcasing Vietnam War history',
  })
  description: string;

  @ApiProperty({
    description: 'Estimated cost',
    example: 40000,
  })
  estimatedCost: number;

  @ApiProperty({
    description: 'Recommended duration in minutes',
    example: 150,
  })
  duration: number;

  @ApiProperty({
    description: 'Activity category',
    example: 'cultural',
  })
  category: string;

  @ApiPropertyOptional({
    description: 'Why this fits the user preferences',
    example: 'Matches your interest in history and cultural experiences',
  })
  reasonForSuggestion?: string;
}

export class CostEstimationResponseDto {
  @ApiProperty({
    description: 'Estimated cost range minimum',
    example: 500000,
  })
  minCost: number;

  @ApiProperty({
    description: 'Estimated cost range maximum',
    example: 1200000,
  })
  maxCost: number;

  @ApiProperty({
    description: 'Average estimated cost',
    example: 850000,
  })
  averageCost: number;

  @ApiProperty({
    description: 'Currency for the estimates',
    example: 'VND',
  })
  currency: string;

  @ApiProperty({
    description: 'Cost breakdown by category',
    type: BudgetBreakdownDto,
  })
  breakdown: BudgetBreakdownDto;

  @ApiPropertyOptional({
    description: 'Cost estimation notes',
    type: [String],
    example: [
      'Prices vary significantly during peak season',
      'Budget travelers can reduce costs by 30-40%',
      'Luxury options available for 2-3x the average cost',
    ],
  })
  notes?: string[];
}
