import { HttpStatus } from '@nestjs/common';
import { BaseResponse, ErrorResponseData } from '../types/base-response.types';

/**
 * Utility class for creating standardized API responses
 */
export class ResponseUtil {
  static success<T>(
    data: T,
    status: HttpStatus = HttpStatus.OK,
  ): BaseResponse<T> {
    return {
      result: 'OK',
      status,
      data,
    };
  }

  static error(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: string[],
    code?: string,
  ): BaseResponse<ErrorResponseData> {
    return {
      result: 'NG',
      status,
      data: {
        message,
        details,
        code,
      },
    };
  }

  static validationError(
    details: string[],
    message: string = 'Validation failed',
  ): BaseResponse<ErrorResponseData> {
    return this.error(
      message,
      HttpStatus.BAD_REQUEST,
      details,
      'VALIDATION_ERROR',
    );
  }

  static unauthorized(
    message: string = 'Unauthorized access',
  ): BaseResponse<ErrorResponseData> {
    return this.error(
      message,
      HttpStatus.UNAUTHORIZED,
      undefined,
      'UNAUTHORIZED',
    );
  }

  static notFound(
    message: string = 'Resource not found',
  ): BaseResponse<ErrorResponseData> {
    return this.error(message, HttpStatus.NOT_FOUND, undefined, 'NOT_FOUND');
  }

  static conflict(
    message: string = 'Resource already exists',
  ): BaseResponse<ErrorResponseData> {
    return this.error(message, HttpStatus.CONFLICT, undefined, 'CONFLICT');
  }
}
