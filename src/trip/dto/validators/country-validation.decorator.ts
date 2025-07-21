import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Simple country code validator
 * Accepts any 2-letter uppercase country code
 */
@ValidatorConstraint({ async: false })
export class IsValidCountryConstraint implements ValidatorConstraintInterface {
  validate(countryCode: string): boolean {
    // Simple validation: 2-letter uppercase code
    return typeof countryCode === 'string' && /^[A-Z]{2}$/.test(countryCode);
  }

  defaultMessage(): string {
    return 'Country code must be a valid 2-letter ISO code (e.g., US, GB, JP)';
  }
}

/**
 * Simple currency code validator
 * Accepts any 3-letter uppercase currency code
 */
@ValidatorConstraint({ async: false })
export class IsValidCurrencyConstraint implements ValidatorConstraintInterface {
  validate(currencyCode: string): boolean {
    // Simple validation: 3-letter uppercase code
    return typeof currencyCode === 'string' && /^[A-Z]{3}$/.test(currencyCode);
  }

  defaultMessage(): string {
    return 'Currency code must be a valid 3-letter ISO code (e.g., USD, EUR, JPY)';
  }
}

/**
 * Decorator for validating country codes
 */
export function IsValidCountry(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCountryConstraint,
    });
  };
}

/**
 * Decorator for validating currency codes
 */
export function IsValidCurrency(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCurrencyConstraint,
    });
  };
}
