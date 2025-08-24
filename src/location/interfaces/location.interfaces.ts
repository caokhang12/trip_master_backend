// Domain interfaces shared across Location module

// Simpler, clearer names
export interface LocationItem {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  address?: string;
  country?: string;
}

export interface LocationSearchResult {
  locations: LocationItem[];
  totalResults: number;
  searchTime: number; // milliseconds
}
