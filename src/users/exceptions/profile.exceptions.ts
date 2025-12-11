import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for profile validation errors
 */
export class ProfileValidationException extends HttpException {
  constructor(field: string, message: string) {
    super(
      {
        result: 'NG',
        status: HttpStatus.BAD_REQUEST,
        data: {
          message: `Validation failed for field: ${field}`,
          field,
          details: [message],
          code: 'PROFILE_VALIDATION_ERROR',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Custom exception for duplicate email
 */
export class EmailAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      {
        result: 'NG',
        status: HttpStatus.CONFLICT,
        data: {
          message: 'Email already in use',
          field: 'email',
          details: [`Email ${email} already exists in the system`],
          code: 'EMAIL_EXISTS',
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Custom exception for invalid file upload
 */
export class InvalidFileException extends HttpException {
  constructor(reason: string) {
    super(
      {
        result: 'NG',
        status: HttpStatus.BAD_REQUEST,
        data: {
          message: 'Invalid file',
          field: 'file',
          details: [reason],
          code: 'INVALID_FILE',
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Field-specific error messages for profile validation
 */
export const PROFILE_ERROR_MESSAGES = {
  email: {
    invalid: 'Invalid email address',
    exists: 'Email already in use',
    required: 'Email is required',
  },
  firstName: {
    minLength: 'First name must be at least 2 characters',
    maxLength: 'First name cannot exceed 50 characters',
    pattern: 'First name can only contain letters and spaces',
    required: 'First name is required',
  },
  lastName: {
    minLength: 'Last name must be at least 2 characters',
    maxLength: 'Last name cannot exceed 50 characters',
    pattern: 'Last name can only contain letters and spaces',
    required: 'Last name is required',
  },
  preferredLanguage: {
    invalid: 'Language not supported',
  },
  preferredCurrency: {
    invalid: 'Currency not supported',
  },
  homeCountry: {
    maxLength: 'Country name cannot exceed 100 characters',
  },
  avatar: {
    size: 'Image size cannot exceed 5MB',
    type: 'Only image formats accepted: JPG, PNG, GIF, WebP',
    dimensions: 'Image dimensions: minimum 100x100px, maximum 4000x4000px',
  },
  travelStyle: {
    invalid: 'Invalid travel style',
  },
  interests: {
    tooMany: 'Maximum 20 interests allowed',
  },
  dietaryRestrictions: {
    tooMany: 'Maximum 10 dietary restrictions allowed',
  },
  accessibilityNeeds: {
    tooMany: 'Maximum 10 accessibility needs allowed',
  },
};
