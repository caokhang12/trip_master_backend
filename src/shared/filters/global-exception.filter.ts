import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ResponseUtil } from '../utils/response.util';

/**
 * Global exception filter for handling all HTTP exceptions
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as {
          message?: string;
          error?: string;
        };
        message =
          responseObj.message || responseObj.error || 'An error occurred';
        details = Array.isArray(responseObj.message) ? responseObj.message : [];
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = ResponseUtil.error(message, status, details);
    response.status(status).json(errorResponse);
  }
}
