import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Interface for objects that have country-aware properties
 */
interface CountryAwareObject {
  destinationCountry?: string;
  preferredCountry?: string;
}

/**
 * Type guard to check if an object has country-aware properties
 */
function isCountryAwareObject(obj: unknown): obj is CountryAwareObject {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Mapping of countries to their default currencies
 */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Southeast Asia
  VN: 'VND', // Vietnam
  TH: 'THB', // Thailand
  SG: 'SGD', // Singapore
  MY: 'MYR', // Malaysia
  ID: 'IDR', // Indonesia
  PH: 'PHP', // Philippines
  KH: 'KHR', // Cambodia
  LA: 'LAK', // Laos
  MM: 'MMK', // Myanmar
  BN: 'BND', // Brunei

  // East Asia
  JP: 'JPY', // Japan
  KR: 'KRW', // South Korea
  CN: 'CNY', // China
  TW: 'TWD', // Taiwan
  HK: 'HKD', // Hong Kong
  MO: 'MOP', // Macau

  // South Asia
  IN: 'INR', // India
  PK: 'PKR', // Pakistan
  BD: 'BDT', // Bangladesh
  LK: 'LKR', // Sri Lanka
  NP: 'NPR', // Nepal
  BT: 'BTN', // Bhutan
  MV: 'MVR', // Maldives

  // Europe
  GB: 'GBP', // United Kingdom
  EU: 'EUR', // European Union countries
  DE: 'EUR', // Germany
  FR: 'EUR', // France
  IT: 'EUR', // Italy
  ES: 'EUR', // Spain
  NL: 'EUR', // Netherlands
  BE: 'EUR', // Belgium
  AT: 'EUR', // Austria
  PT: 'EUR', // Portugal
  IE: 'EUR', // Ireland
  GR: 'EUR', // Greece
  FI: 'EUR', // Finland
  LU: 'EUR', // Luxembourg
  CH: 'CHF', // Switzerland
  NO: 'NOK', // Norway
  SE: 'SEK', // Sweden
  DK: 'DKK', // Denmark
  PL: 'PLN', // Poland
  CZ: 'CZK', // Czech Republic
  HU: 'HUF', // Hungary
  RO: 'RON', // Romania
  BG: 'BGN', // Bulgaria
  HR: 'HRK', // Croatia

  // North America
  US: 'USD', // United States
  CA: 'CAD', // Canada
  MX: 'MXN', // Mexico

  // South America
  BR: 'BRL', // Brazil
  AR: 'ARS', // Argentina
  CL: 'CLP', // Chile
  CO: 'COP', // Colombia
  PE: 'PEN', // Peru
  VE: 'VES', // Venezuela
  UY: 'UYU', // Uruguay
  PY: 'PYG', // Paraguay
  BO: 'BOB', // Bolivia
  EC: 'USD', // Ecuador (uses USD)

  // Africa
  ZA: 'ZAR', // South Africa
  NG: 'NGN', // Nigeria
  EG: 'EGP', // Egypt
  KE: 'KES', // Kenya
  GH: 'GHS', // Ghana
  MA: 'MAD', // Morocco
  TN: 'TND', // Tunisia
  DZ: 'DZD', // Algeria

  // Oceania
  AU: 'AUD', // Australia
  NZ: 'NZD', // New Zealand
  FJ: 'FJD', // Fiji

  // Middle East
  AE: 'AED', // UAE
  SA: 'SAR', // Saudi Arabia
  QA: 'QAR', // Qatar
  KW: 'KWD', // Kuwait
  BH: 'BHD', // Bahrain
  OM: 'OMR', // Oman
  JO: 'JOD', // Jordan
  LB: 'LBP', // Lebanon
  IL: 'ILS', // Israel
  TR: 'TRY', // Turkey
  IR: 'IRR', // Iran
};

/**
 * Mapping of countries to their default timezones
 */
const COUNTRY_TIMEZONE_MAP: Record<string, string[]> = {
  // Southeast Asia
  VN: ['Asia/Ho_Chi_Minh'],
  TH: ['Asia/Bangkok'],
  SG: ['Asia/Singapore'],
  MY: ['Asia/Kuala_Lumpur'],
  ID: ['Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar'],
  PH: ['Asia/Manila'],
  KH: ['Asia/Phnom_Penh'],
  LA: ['Asia/Vientiane'],
  MM: ['Asia/Yangon'],
  BN: ['Asia/Brunei'],

  // East Asia
  JP: ['Asia/Tokyo'],
  KR: ['Asia/Seoul'],
  CN: ['Asia/Shanghai'],
  TW: ['Asia/Taipei'],
  HK: ['Asia/Hong_Kong'],
  MO: ['Asia/Macau'],

  // Europe
  GB: ['Europe/London'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  IT: ['Europe/Rome'],
  ES: ['Europe/Madrid'],
  NL: ['Europe/Amsterdam'],

  // North America
  US: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
  ],
  CA: ['America/Toronto', 'America/Vancouver'],
  MX: ['America/Mexico_City'],

  // Australia
  AU: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'],
  NZ: ['Pacific/Auckland'],
};

@ValidatorConstraint({ async: false })
export class IsValidCountryCurrencyConstraint
  implements ValidatorConstraintInterface
{
  validate(currency: string, args: ValidationArguments): boolean {
    if (!currency) return true; // Optional field

    const object = args.object;
    if (!isCountryAwareObject(object)) return true;

    const country = object.destinationCountry || object.preferredCountry;
    if (!country) return true; // No country to validate against

    const expectedCurrencies = this.getCurrenciesForCountry(country);
    return expectedCurrencies.includes(currency);
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object;
    if (!isCountryAwareObject(object)) {
      return 'Invalid currency format';
    }

    const country = object.destinationCountry || object.preferredCountry;
    if (!country) return 'Currency validation requires a valid country';

    const expectedCurrencies = this.getCurrenciesForCountry(country);
    const suggestionsText =
      expectedCurrencies.length > 0
        ? ` Suggested currencies for ${country}: ${expectedCurrencies.join(', ')}`
        : '';

    return `Currency must be valid for the destination country.${suggestionsText}`;
  }

  private getCurrenciesForCountry(countryCode: string): string[] {
    const currency = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()];
    return currency ? [currency] : [];
  }
}

@ValidatorConstraint({ async: false })
export class IsValidCountryTimezoneConstraint
  implements ValidatorConstraintInterface
{
  validate(timezone: string, args: ValidationArguments): boolean {
    if (!timezone) return true; // Optional field

    const object = args.object;
    if (!isCountryAwareObject(object)) return true;

    const country = object.destinationCountry || object.preferredCountry;
    if (!country) return true; // No country to validate against

    const expectedTimezones = this.getTimezonesForCountry(country);
    return expectedTimezones.includes(timezone);
  }

  defaultMessage(args: ValidationArguments): string {
    const object = args.object;
    if (!isCountryAwareObject(object)) {
      return 'Invalid timezone format';
    }

    const country = object.destinationCountry || object.preferredCountry;
    if (!country) return 'Timezone validation requires a valid country';

    const expectedTimezones = this.getTimezonesForCountry(country);
    const suggestionsText =
      expectedTimezones.length > 0
        ? ` Suggested timezones for ${country}: ${expectedTimezones.join(', ')}`
        : '';

    return `Timezone must be valid for the destination country.${suggestionsText}`;
  }

  private getTimezonesForCountry(countryCode: string): string[] {
    return COUNTRY_TIMEZONE_MAP[countryCode.toUpperCase()] || [];
  }
}

/**
 * Validates that the currency matches the destination country's default currency
 */
export function IsValidCountryCurrency(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCountryCurrencyConstraint,
    });
  };
}

/**
 * Validates that the timezone is appropriate for the destination country
 */
export function IsValidCountryTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCountryTimezoneConstraint,
    });
  };
}

/**
 * Helper function to get the default currency for a country
 */
export function getDefaultCurrencyForCountry(
  countryCode: string,
): string | undefined {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()];
}

/**
 * Helper function to get the default timezones for a country
 */
export function getDefaultTimezonesForCountry(
  countryCode: string,
): string[] | undefined {
  return COUNTRY_TIMEZONE_MAP[countryCode.toUpperCase()];
}

/**
 * Helper function to get suggested currency based on destination country
 */
export function getSuggestedCurrency(
  destinationCountry?: string,
  preferredCountry?: string,
): string | undefined {
  const country = destinationCountry || preferredCountry;
  if (!country) return undefined;

  return getDefaultCurrencyForCountry(country);
}

/**
 * Helper function to get suggested timezone based on destination country
 */
export function getSuggestedTimezone(
  destinationCountry?: string,
  preferredCountry?: string,
): string | undefined {
  const country = destinationCountry || preferredCountry;
  if (!country) return undefined;

  const timezones = getDefaultTimezonesForCountry(country);
  return timezones?.[0]; // Return the first (primary) timezone
}
