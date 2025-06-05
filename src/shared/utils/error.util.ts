import { Injectable } from '@nestjs/common';

/**
 * Shared utility service for type-safe error handling across the application
 */
@Injectable()
export class ErrorUtilService {
  /**
   * Type-safe error message extraction
   * @param error - Unknown error object
   * @returns String representation of the error message
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Type-safe error stack extraction
   * @param error - Unknown error object
   * @returns Error stack trace if available
   */
  static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * Get comprehensive error details for logging
   * @param error - Unknown error object
   * @returns Object containing message and stack trace
   */
  static getErrorDetails(error: unknown): { message: string; stack?: string } {
    return {
      message: this.getErrorMessage(error),
      stack: this.getErrorStack(error),
    };
  }

  /**
   * Check if error is an instance of a specific error type
   * @param error - Unknown error object
   * @param errorType - Error constructor to check against
   * @returns Boolean indicating if error is of specified type
   */
  static isErrorType<T extends Error>(
    error: unknown,
    errorType: new (...args: any[]) => T,
  ): error is T {
    return error instanceof errorType;
  }

  /**
   * Safe error serialization for API responses
   * @param error - Unknown error object
   * @param includeStack - Whether to include stack trace (default: false for production)
   * @returns Serializable error object
   */
  static serializeError(
    error: unknown,
    includeStack = false,
  ): { message: string; stack?: string; type?: string } {
    const result: { message: string; stack?: string; type?: string } = {
      message: this.getErrorMessage(error),
    };

    if (error instanceof Error) {
      result.type = error.constructor.name;
      if (includeStack) {
        result.stack = error.stack;
      }
    }

    return result;
  }
}
