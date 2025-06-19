import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TravelStyle } from '../../shared/types/base-response.types';
import { BaseUserProfileDto } from '../../shared/dto/user-fields.dto';
import { UserBudgetRangeDto } from '../../shared/dto/money.dto';

// Using shared UserBudgetRangeDto instead of local BudgetRangeDto

export class UpdateProfileDto extends BaseUserProfileDto {
  // Explicitly declare inherited properties for TypeScript compilation
  declare firstName?: string;
  declare lastName?: string;
  declare avatarUrl?: string;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Preferred travel styles',
    enum: TravelStyle,
    isArray: true,
    required: false,
    example: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyle, { each: true })
  travelStyle?: TravelStyle[];

  @ApiProperty({
    description: 'Budget range for trips',
    type: UserBudgetRangeDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserBudgetRangeDto)
  budgetRange?: UserBudgetRangeDto;

  @ApiProperty({
    description: 'User interests and hobbies',
    type: [String],
    required: false,
    example: ['photography', 'hiking', 'museums', 'local cuisine'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiProperty({
    description: 'Dietary restrictions and preferences',
    type: [String],
    required: false,
    example: ['vegetarian', 'gluten-free', 'halal'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiProperty({
    description: 'Accessibility requirements',
    type: [String],
    required: false,
    example: [
      'wheelchair accessible',
      'hearing assistance',
      'visual assistance',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibilityNeeds?: string[];
}

export class UpdateUserDto extends UpdateProfileDto {
  // Inherited properties from UpdateProfileDto
  declare firstName?: string;
  declare lastName?: string;
  declare avatarUrl?: string;

  @ApiProperty({
    description: 'User travel preferences and settings',
    type: UpdatePreferencesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
