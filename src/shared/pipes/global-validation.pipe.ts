import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Global validation pipe for request body validation
 */
@Injectable()
export class GlobalValidationPipe implements PipeTransform<unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = plainToInstance(metatype, value, {
      enableImplicitConversion: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages: string[] = [];

      const extractErrors = (errs: any[], prefix = ''): void => {
        for (const error of errs) {
          const field = prefix ? `${prefix}.${error.property}` : error.property;
          const constraints = error.constraints || {};
          const messages = Object.values(constraints);

          if (messages.length > 0) {
            errorMessages.push(`${field}: ${messages.join(', ')}`);
          }

          // Recursively handle nested children (for arrays and nested objects)
          if (error.children && error.children.length > 0) {
            extractErrors(error.children, field);
          }
        }
      };

      extractErrors(errors);

      // If no detailed messages were extracted, show at least field names
      if (errorMessages.length === 0) {
        for (const error of errors) {
          errorMessages.push(`${error.property}: validation failed`);
        }
      }

      throw new BadRequestException({
        message: 'Validation failed',
        details: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
