/**
 * Standard API response format for the TripMaster application
 */
export interface BaseResponse<T = any> {
  result: 'OK' | 'NG';
  status: number;
  data: T;
}

/**
 * Error response data structure
 */
export interface ErrorResponseData {
  message: string;
  details?: string[];
  code?: string;
}

/**
 * Success response data for authentication endpoints
 */
export interface AuthResponseData {
  access_token: string;
  refresh_token: string;
  user_profile: UserProfileData;
}

/**
 * User profile data structure
 */
export interface UserProfileData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  hasAvatar?: boolean;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role enumeration
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * Travel style enumeration
 */
export enum TravelStyle {
  ADVENTURE = 'adventure',
  LUXURY = 'luxury',
  BUDGET = 'budget',
  CULTURAL = 'cultural',
  FAMILY = 'family',
  BUSINESS = 'business',
}

/**
 * User preferences data structure
 */
export interface UserPreferencesData {
  travelStyle?: TravelStyle[];
  budgetRange?: {
    min: number;
    max: number;
    currency: string;
  };
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
}
