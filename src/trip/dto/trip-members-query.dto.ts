import { IsOptional, IsString } from 'class-validator';

export class TripMembersQueryDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
