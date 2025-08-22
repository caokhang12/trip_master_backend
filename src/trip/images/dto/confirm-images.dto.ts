import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmImageItemDto {
  @ApiProperty() @IsString() @MaxLength(255) publicId: string;
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() format?: string;
  @ApiPropertyOptional() @IsOptional() width?: number;
  @ApiPropertyOptional() @IsOptional() height?: number;
  @ApiPropertyOptional() @IsOptional() bytes?: number;
}

export class ConfirmTripImagesDto {
  @ApiProperty({ type: [ConfirmImageItemDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConfirmImageItemDto)
  images: ConfirmImageItemDto[];

  @ApiPropertyOptional({ description: 'publicId ảnh muốn đặt thumbnail' })
  @IsOptional()
  @IsString()
  thumbnailPublicId?: string;
}

export class ReorderTripImagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ValidateNested({ each: false })
  order: string[];
}

export class DiffTripImagesDto {
  @ApiProperty({
    type: [String],
    description: 'Danh sách publicId muốn giữ lại',
  })
  @IsArray()
  keep: string[];
  @ApiPropertyOptional({ description: 'Thumbnail mới (optional)' })
  @IsOptional()
  @IsString()
  thumbnailPublicId?: string;
}

export class SetThumbnailDto {
  @ApiProperty() @IsString() publicId: string;
}
