/**
 * Type definitions for external API responses
 */

// Goong API response types
export interface GoongLocation {
  lat: number;
  lng: number;
}

export interface GoongGeometry {
  location: GoongLocation;
}

export interface GoongCompound {
  district?: string;
  commune?: string;
  province?: string;
}

export interface GoongResult {
  place_id?: string;
  name?: string;
  formatted_address: string;
  geometry: GoongGeometry;
  types?: string[];
  compound?: GoongCompound;
}

export interface GoongResponse {
  results: GoongResult[];
  status: string;
}

// Nominatim API response types
export interface NominatimAddress {
  country?: string;
  country_code?: string;
  state?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  postcode?: string;
}

export interface NominatimResult {
  place_id?: number;
  licence?: string;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
  address?: NominatimAddress;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
}

// Geoapify API response types
export interface GeoapifyCoordinates {
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoapifyGeometry {
  type: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoapifyProperties {
  place_id?: string;
  name?: string;
  address_line1?: string;
  address_line2?: string;
  formatted?: string;
  categories?: string[];
  rating?: number;
  opening_hours?: Record<string, string>;
  price_level?: string;
  photos?: string[];
  contact?: {
    phone?: string;
    website?: string;
    email?: string;
  };
  details?: Record<string, any>;
}

export interface GeoapifyFeature {
  type: string;
  properties: GeoapifyProperties;
  geometry: GeoapifyGeometry;
}

export interface GeoapifyResponse {
  type: string;
  features: GeoapifyFeature[];
}

// Vietnamese provinces API response types
export interface VietnamProvince {
  code: number;
  name: string;
  name_with_type?: string;
  slug?: string;
  type?: string;
  codename?: string;
}

export interface VietnamDistrict {
  code: number;
  name: string;
  name_with_type?: string;
  slug?: string;
  type?: string;
  path?: string;
  path_with_type?: string;
  parent_code?: number;
}

export interface VietnamWard {
  code: number;
  name: string;
  name_with_type?: string;
  slug?: string;
  type?: string;
  path?: string;
  path_with_type?: string;
  parent_code?: number;
}

export interface VietnamProvinceWithDistricts extends VietnamProvince {
  districts?: VietnamDistrict[];
}

export interface VietnamDistrictWithWards extends VietnamDistrict {
  wards?: VietnamWard[];
}
