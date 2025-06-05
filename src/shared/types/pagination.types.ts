/**
 * Shared pagination interfaces and types for TripMaster application
 */

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Generic pagination result wrapper
 */
export interface PaginationResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Basic pagination options interface
 */
export interface BasePaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Enhanced pagination options with search and sorting
 */
export interface ExtendedPaginationOptions extends BasePaginationOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
