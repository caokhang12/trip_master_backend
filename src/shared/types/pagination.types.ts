/**
 * Unified pagination interfaces and types for TripMaster application
 * Using TypeORM native pagination approach
 */

/**
 * Standard pagination metadata for TypeORM native pagination
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic pagination result wrapper for TypeORM native approach
 */
export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
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

/**
 * Utility class for TypeORM native pagination
 */
export class PaginationHelper {
  /**
   * Create pagination metadata from TypeORM count and options
   */
  static createMeta(
    total: number,
    page: number = 1,
    limit: number = 10,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Create complete pagination result
   */
  static createResult<T>(
    items: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
  ): PaginationResult<T> {
    return {
      items,
      meta: this.createMeta(total, page, limit),
    };
  }

  /**
   * Calculate skip value for TypeORM queries
   */
  static getSkip(page: number = 1, limit: number = 10): number {
    return (page - 1) * limit;
  }

  /**
   * Validate and normalize pagination parameters
   */
  static validateParams(
    page?: number,
    limit?: number,
    maxLimit: number = 100,
  ): { page: number; limit: number; skip: number } {
    const normalizedPage = Math.max(1, page || 1);
    const normalizedLimit = Math.min(Math.max(1, limit || 10), maxLimit);
    const skip = this.getSkip(normalizedPage, normalizedLimit);

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      skip,
    };
  }
}
