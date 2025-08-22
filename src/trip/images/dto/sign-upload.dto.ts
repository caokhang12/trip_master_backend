import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SignTripImagesRequestDto {
  @ApiPropertyOptional({ description: 'Số slot cần ký', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number = 1;
}

export class SignedUploadInstructionDto {
  @ApiProperty() publicId: string;
  @ApiProperty() folder: string;
  @ApiProperty() timestamp: number;
  @ApiProperty() signature: string;
  @ApiProperty() apiKey: string;
  @ApiProperty() cloudName: string;
}

export class SignTripImagesResponseDto {
  @ApiProperty({ type: [SignedUploadInstructionDto] })
  uploadSlots: SignedUploadInstructionDto[];
  @ApiProperty() remainingCapacity: number;
  @ApiProperty() maxPerTrip: number;
}
