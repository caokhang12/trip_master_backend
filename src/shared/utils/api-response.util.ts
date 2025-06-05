import { HttpStatus } from '@nestjs/common';

/**
 * Interface for standard API response structure
 */
export interface ApiResponse<T = any> {
  result: string;
  status: HttpStatus;
  data: T;
}

/**
 * Interface for paginated API response structure
 */
export interface ApiPaginatedResponse<T = any> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Utility class for creating standardized API responses
 */
export class ApiResponseUtil {
  /**
   * Create a successful response with data
   */
  static success<T>(
    data: T,
    status: HttpStatus = HttpStatus.OK,
  ): ApiResponse<T> {
    return {
      result: 'OK',
      status,
      data,
    };
  }

  /**
   * Create a paginated response with data and pagination metadata
   */
  static paginated<T>(
    items: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore?: boolean;
    },
    status: HttpStatus = HttpStatus.OK,
  ): ApiPaginatedResponse<T> {
    const hasMore =
      pagination.hasMore ?? pagination.page < pagination.totalPages;
    return {
      result: 'OK',
      status,
      data: items,
      pagination: {
        ...pagination,
        hasMore,
      },
    };
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: any,
  ): {
    result: string;
    status: HttpStatus;
    message: string;
    details?: any;
  } {
    return {
      result: 'ERROR',
      status,
      message,
      ...(details && { details }),
    };
  }
}
