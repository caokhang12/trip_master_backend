export interface GeneratedActivity {
  time?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  cost?: number;
  currency?: string;
  poi?: {
    placeId: string;
    name: string;
    formattedAddress: string;
    location: { lat: number; lng: number };
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    types?: string[];
    openingHours?: {
      openNow?: boolean;
      weekdayText?: string[];
    };
  } | null;
}

export interface GeneratedDay {
  dayNumber: number;
  date?: string;
  activities: GeneratedActivity[];
}

export interface GeneratedItinerary {
  days: GeneratedDay[];
  totalCost?: number;
  currency?: string;
  notes?: string[];
}
