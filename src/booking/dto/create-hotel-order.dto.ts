import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TitleEnum {
  MR = 'MR',
  MRS = 'MRS',
  MS = 'MS',
}

export enum PaymentMethodEnum {
  CREDIT_CARD = 'CREDIT_CARD',
}

export class GuestPayloadDto {
  @ApiProperty({
    example: 1,
    description: 'Guest temp id referenced by roomAssociations.guestReferences',
  })
  @IsInt()
  tid!: number;

  @ApiProperty({ enum: TitleEnum, example: 'MR', required: false })
  @IsOptional()
  @IsEnum(TitleEnum)
  title?: TitleEnum;

  @ApiProperty({ example: 'BOB' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'SMITH' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+33679278416' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'bob.smith@email.com' })
  @IsEmail()
  email!: string;
}

class TravelAgentContactDto {
  @ApiProperty({ example: 'bob.smith@email.com' })
  @IsEmail()
  email!: string;
}

class TravelAgentDto {
  @ApiProperty({ type: TravelAgentContactDto })
  @ValidateNested()
  @Type(() => TravelAgentContactDto)
  contact!: TravelAgentContactDto;
}

class GuestReferenceDto {
  @ApiProperty({
    example: '1',
    description: 'Reference to guest.tid as string',
  })
  @IsString()
  @IsNotEmpty()
  guestReference!: string;
}

export class RoomAssociationPayloadDto {
  @ApiProperty({ type: [GuestReferenceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestReferenceDto)
  guestReferences!: GuestReferenceDto[];

  @ApiProperty({ example: '4L8PRJPEN7' })
  @IsString()
  @IsNotEmpty()
  hotelOfferId!: string;
}

class PaymentCardInfoDto {
  @ApiProperty({
    example: 'VI',
    description: 'Card vendor code (e.g., VI, CA, AX)',
  })
  @IsString()
  @Length(2, 2)
  vendorCode!: string;

  @ApiProperty({
    example: '4151289722471370',
    description: 'Card number without spaces',
  })
  @IsString()
  @Matches(/^[0-9]{13,19}$/)
  cardNumber!: string;

  @ApiProperty({ example: '2026-08', description: 'Expiry date YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  expiryDate!: string;

  @ApiProperty({ example: 'BOB SMITH', required: false })
  @IsOptional()
  @IsString()
  holderName?: string;
}

class PaymentCardDto {
  @ApiProperty({ type: PaymentCardInfoDto })
  @ValidateNested()
  @Type(() => PaymentCardInfoDto)
  paymentCardInfo!: PaymentCardInfoDto;
}

export class PaymentPayloadDto {
  @ApiProperty({
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.CREDIT_CARD,
  })
  @IsEnum(PaymentMethodEnum)
  method!: PaymentMethodEnum;

  @ApiProperty({ type: PaymentCardDto })
  @ValidateNested()
  @Type(() => PaymentCardDto)
  paymentCard!: PaymentCardDto;
}

export class HotelOrderDataDto {
  @ApiProperty({ example: 'hotel-order' })
  @IsString()
  @IsIn(['hotel-order'])
  type!: 'hotel-order';

  @ApiProperty({ type: [GuestPayloadDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestPayloadDto)
  guests!: GuestPayloadDto[];

  @ApiProperty({ type: TravelAgentDto })
  @ValidateNested()
  @Type(() => TravelAgentDto)
  travelAgent!: TravelAgentDto;

  @ApiProperty({ type: [RoomAssociationPayloadDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoomAssociationPayloadDto)
  roomAssociations!: RoomAssociationPayloadDto[];

  @ApiProperty({ type: PaymentPayloadDto })
  @ValidateNested()
  @Type(() => PaymentPayloadDto)
  payment!: PaymentPayloadDto;
}

export class CreateHotelOrderDto {
  @ApiProperty({ type: HotelOrderDataDto })
  @ValidateNested()
  @Type(() => HotelOrderDataDto)
  data!: HotelOrderDataDto;
}
