import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { exampleEndDate, exampleStartDate } from 'src/shared/dto/date.dto';

export enum AMENITIES {
  SWIMMING_POOL = 'SWIMMING_POOL',
  SPA = 'SPA',
  FITNESS_CENTER = 'FITNESS_CENTER',
  AIR_CONDITIONING = 'AIR_CONDITIONING',
  RESTAURANT = 'RESTAURANT',
  PARKING = 'PARKING',
  PETS_ALLOWED = 'PETS_ALLOWED',
  AIRPORT_SHUTTLE = 'AIRPORT_SHUTTLE',
  BUSINESS_CENTER = 'BUSINESS_CENTER',
  DISABLED_FACILITIES = 'DISABLED_FACILITIES',
  WIFI = 'WIFI',
  MEETING_ROOMS = 'MEETING_ROOMS',
  NO_KID_ALLOWED = 'NO_KID_ALLOWED',
  TENNIS = 'TENNIS',
  GOLF = 'GOLF',
  KITCHEN = 'KITCHEN',
  ANIMAL_WATCHING = 'ANIMAL_WATCHING',
  BEACH = 'BEACH',
  CASINO = 'CASINO',
  JACUZZI = 'JACUZZI',
  SAUNA = 'SAUNA',
  SOLARIUM = 'SOLARIUM',
  MASSAGE = 'MASSAGE',
  VALET_PARKING = 'VALET_PARKING',
  LOUNGE = 'LOUNGE',
  KIDS_WELCOME = 'KIDS_WELCOME',
  NO_PORN_FILMS = 'NO_PORN_FILMS',
  MINIBAR = 'MINIBAR',
  TELEVISION = 'TELEVISION',
  ROOM_SERVICE = 'ROOM_SERVICE',
  GUARDED_PARKG = 'GUARDED_PARKG',
  SERV_SPEC_MENU = 'SERV_SPEC_MENU',
  BABY_SITTING = 'BABY-SITTING',
  WIFI_INROOM = 'WI-FI_IN_ROOM',
}

export enum RATINGS {
  ONE_STAR = '1',
  TWO_STAR = '2',
  THREE_STAR = '3',
  FOUR_STAR = '4',
  FIVE_STAR = '5',
}

export enum HOTEL_SOURCE {
  BEDBANK = 'BEDBANK',
  DIRECTCHAIN = 'DIRECTCHAIN',
  ALL = 'ALL',
}

export enum PAYMENT_POLICY {
  NONE = 'NONE',
  GUARANTEED = 'GUARANTEED',
  DEPOSIT = 'DEPOSIT',
}

export enum BOARD_TYPE {
  ROOM_ONLY = 'ROOM_ONLY',
  BREAKFAST = 'BREAKFAST',
  HALF_BOARD = 'HALF_BOARD',
  FULL_BOARD = 'FULL_BOARD',
  ALL_INCLUSIVE = 'ALL_INCLUSIVE',
}

export class getHotelsByCityDto {
  @ApiProperty({
    description: 'City IATA code (e.g., PAR)',
    example: 'PAR',
  })
  @IsString()
  @Length(3, 5)
  cityCode: string;

  @ApiProperty({
    description:
      'Maximum distance from the geographical coordinates express in defined units. The default radius is 5 KM.',
    required: false,
  })
  @IsOptional()
  @IsPositive()
  radius?: number;

  @ApiProperty({
    description:
      'Unit of measurement used to express the radius  (e.g., KM, MI)',
    example: 'KM',
    required: false,
  })
  @IsOptional()
  @IsString()
  radiusUnit?: string;

  @ApiProperty({
    description:
      'Array of hotel chain codes. Each code is a string consisted of 2 capital alphabetic characters',
    required: false,
  })
  @IsOptional()
  @IsArray()
  chainCodes?: string[];

  @ApiProperty({
    enum: AMENITIES,
    isArray: true,
    description: 'List of desired amenities',
    example: ['SPA', 'WIFI', 'AIR_CONDITIONING'],
    required: false,
  })
  @IsOptional()
  @IsEnum(AMENITIES, { each: true })
  amenities?: AMENITIES[];

  @ApiProperty({
    enum: RATINGS,
    isArray: true,
    description: 'Hotel star ratings (1 to 5)',
    example: ['3', '4', '5'],
    required: false,
  })
  @IsOptional()
  @IsEnum(RATINGS, { each: true })
  ratings?: RATINGS[];

  @ApiProperty({
    enum: HOTEL_SOURCE,
    description: 'Source of hotel data',
    example: 'ALL',
    required: false,
  })
  @IsOptional()
  @IsEnum(HOTEL_SOURCE)
  hotelSource?: HOTEL_SOURCE;
}

export class getHotelOffersDto {
  @ApiProperty({
    type: [String],
    description:
      'Amadeus property codes on 8 chars. Mandatory parameter for a search by predefined list of hotels.',
    example: '["HNPARKGU"]',
    required: true,
  })
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  hotelIds: string[];

  @ApiProperty({
    description: 'Number of adult guests (1-9) per room.',
    example: 2,
    required: false,
  })
  @IsPositive()
  @IsOptional()
  adults?: number;

  @ApiProperty({
    description:
      'Check-in date in YYYY-MM-DD format.The lowest accepted value is the present date (no dates in the past). If not present, the default value will be today`s date in the GMT time zone.',
    example: exampleStartDate,
    required: false,
  })
  @IsString()
  checkInDate?: string;

  @ApiProperty({
    description: 'Check-out date in YYYY-MM-DD format.',
    example: exampleEndDate,
    required: false,
  })
  @IsString()
  @IsOptional()
  checkOutDate?: string;

  @ApiProperty({
    description:
      'Code of the country of residence of the traveler expressed using ISO 3166-1 format.',
    example: 'VN',
    required: false,
  })
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiProperty({
    description: 'Number of rooms to book(1-9).',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  roomQuantity?: number;

  @ApiProperty({
    description:
      'Filter hotel offers by price per night interval (ex: 200-300 or -300 or 100). It is mandatory to include a currency when this field is set.',
    example: 100,
    required: false,
  })
  @IsOptional()
  price?: string;

  @ApiProperty({
    description: 'Currency code (e.g., USD, EUR)',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description:
      'Filter the response based on a specific payment type. NONE means all types (default).',
    enum: PAYMENT_POLICY,
    example: PAYMENT_POLICY.NONE,
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentPolicy?: PAYMENT_POLICY;

  @ApiProperty({
    description:
      'Filter the response based on a specific board type. ROOM_ONLY means all types (default).',
    enum: BOARD_TYPE,
    required: false,
  })
  @IsOptional()
  boardType?: BOARD_TYPE;

  @ApiProperty({
    description:
      'Show all properties (include sold out) or available only. For sold out properties, please check availability on other dates.',
    required: false,
  })
  @IsOptional()
  includeClosed?: boolean;

  @ApiProperty({
    description:
      'Used to return only the cheapest offer per hotel or all available offers.',
    required: false,
  })
  @IsOptional()
  bestRateOnly?: boolean;

  @ApiProperty({
    description:
      'Requested language of descriptive texts. If a language is not available the text will be returned in english.',
    required: false,
  })
  @IsOptional()
  @IsString()
  lang?: string;
}
