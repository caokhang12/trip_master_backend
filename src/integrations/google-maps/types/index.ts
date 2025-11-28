export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceDetailsResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: LatLng;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types?: string[];
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  photos?: Array<{
    photoReference: string;
    height: number;
    width: number;
  }>;
  internationalPhoneNumber?: string;
  website?: string;
  businessStatus?: string;
  utcOffset?: number;
  vicinity?: string;
}

export interface GeocodingResult {
  formattedAddress: string;
  location: LatLng;
  locationType?: string;
  placeId: string;
  addressComponents?: Array<{
    longName: string;
    shortName: string;
    types: string[];
  }>;
}

export interface DirectionsResult {
  routes: Array<{
    summary: string;
    legs: Array<{
      startAddress: string;
      endAddress: string;
      startLocation: LatLng;
      endLocation: LatLng;
      distance: {
        text: string;
        value: number; // meters
      };
      duration: {
        text: string;
        value: number; // seconds
      };
      steps: Array<{
        htmlInstructions: string;
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        startLocation: LatLng;
        endLocation: LatLng;
        travelMode: string;
      }>;
    }>;
    overviewPolyline: string;
    bounds: {
      northeast: LatLng;
      southwest: LatLng;
    };
    copyrights: string;
    warnings?: string[];
  }>;
}

export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: Array<{
    elements: Array<{
      status: string;
      distance?: {
        text: string;
        value: number; // meters
      };
      duration?: {
        text: string;
        value: number; // seconds
      };
      durationInTraffic?: {
        text: string;
        value: number; // seconds
      };
    }>;
  }>;
}

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface Waypoint {
  lat: number;
  lng: number;
}
