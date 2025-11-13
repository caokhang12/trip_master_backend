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
        const responseObj = exceptionResponse as Record<string, unknown>;
        // Prefer explicit message field, fallback to error
        if (typeof responseObj.message === 'string') {
          message = responseObj.message as string;
        } else if (typeof responseObj.error === 'string') {
          message = responseObj.error as string;
        } else {
          message = 'An error occurred';
        }

        // If the exception provided a details array (our ValidationPipe does), use it.
        if (Array.isArray(responseObj.details)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          details = responseObj.details as string[];
        } else if (Array.isArray(responseObj.message)) {
          // Some libraries put validation messages into `message` as an array
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          details = responseObj.message as string[];
        } else {
          details = [];
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = ResponseUtil.error(message, status, details);
    response.status(status).json(errorResponse);
  }
}
