import { Injectable } from '@nestjs/common';
import {
  PaginationResult,
  PaginationMeta,
  BasePaginationOptions,
} from '../types/pagination.types';

/**
 * Utility service for pagination operations
 */
@Injectable()
export class PaginationUtilService {
  /**
   * Calculate skip value for pagination
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Number of items to skip
   */
  static calculateSkip(page: number = 1, limit: number = 10): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages from total items and limit
   * @param total - Total number of items
   * @param limit - Items per page
   * @returns Total number of pages
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Create pagination metadata
   * @param options - Pagination options
   * @param total - Total number of items
   * @returns Pagination metadata object
   */
  static createPaginationMeta(
    options: BasePaginationOptions & { total: number },
  ): PaginationMeta {
    const { page = 1, limit = 10, total } = options;
    const totalPages = this.calculateTotalPages(total, limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Create a paginated result object
   * @param items - Array of items for current page
   * @param options - Pagination options including total count
   * @returns Complete pagination result
   */
  static createPaginationResult<T>(
    items: T[],
    options: BasePaginationOptions & { total: number },
  ): PaginationResult<T> {
    return {
      items,
      pagination: this.createPaginationMeta(options),
    };
  }

  /**
   * Validate and normalize pagination parameters
   * @param page - Page number
   * @param limit - Items per page
   * @param maxLimit - Maximum allowed limit (default: 100)
   * @returns Normalized pagination parameters
   */
  static validateAndNormalizePagination(
    page?: number,
    limit?: number,
    maxLimit: number = 100,
  ): { page: number; limit: number; skip: number } {
    const normalizedPage = Math.max(1, page || 1);
    const normalizedLimit = Math.min(Math.max(1, limit || 10), maxLimit);
    const skip = this.calculateSkip(normalizedPage, normalizedLimit);

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      skip,
    };
  }
}
