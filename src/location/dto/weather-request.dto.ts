import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';

/**
 * DTO for weather information requests
 */
export class WeatherRequestDto extends BaseCoordinateDto {
  @ApiProperty({
    description: 'Include extended forecast (7 days)',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeForecast?: boolean = true;

  @ApiProperty({
    description: 'Include Vietnam-specific travel recommendations',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeVietnamInfo?: boolean = true;
}
