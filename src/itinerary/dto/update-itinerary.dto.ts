import { PartialType } from '@nestjs/swagger';
import { CreateItineraryDto } from './create-itinerary.dto';
// No extra fields for now

export class UpdateItineraryDto extends PartialType(CreateItineraryDto) {}
