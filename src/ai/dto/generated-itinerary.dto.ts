export interface GeneratedActivity {
  time?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  cost?: number;
  currency?: string;
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
}
