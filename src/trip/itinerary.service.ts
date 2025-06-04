import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripEntity } from '../schemas/trip.entity';
import { UpdateItineraryDto, GenerateItineraryDto } from './dto/trip.dto';

/**
 * Service for managing trip itineraries and AI integration
 */
@Injectable()
export class ItineraryService {
  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
  ) {}

  /**
   * Generate AI-powered itinerary for a trip
   */
  async generateItinerary(
    tripId: string,
    userId: string,
    generateDto: GenerateItineraryDto,
  ): Promise<ItineraryEntity[]> {
    // Validate trip ownership
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new BadRequestException('Trip not found or access denied');
    }

    if (!trip.startDate || !trip.endDate) {
      throw new BadRequestException(
        'Trip must have start and end dates for itinerary generation',
      );
    }

    // Calculate trip duration
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const tripDays =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Clear existing itinerary
    await this.itineraryRepository.delete({ tripId });

    // Generate AI itinerary (placeholder implementation)
    const itineraryData = this.generateAIItinerary(trip, tripDays, generateDto);

    // Save generated itinerary
    const savedItinerary: ItineraryEntity[] = [];
    for (let day = 1; day <= tripDays; day++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + day - 1);

      const itineraryEntity = this.itineraryRepository.create({
        tripId,
        dayNumber: day,
        date: dayDate,
        activities: itineraryData[day - 1] || [],
        aiGenerated: true,
        userModified: false,
      });

      const saved = await this.itineraryRepository.save(itineraryEntity);
      savedItinerary.push(saved);
    }

    return savedItinerary;
  }

  /**
   * Update specific day itinerary
   */
  async updateDayItinerary(
    tripId: string,
    userId: string,
    dayNumber: number,
    updateDto: UpdateItineraryDto,
  ): Promise<ItineraryEntity> {
    // Validate trip ownership
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new BadRequestException('Trip not found or access denied');
    }

    // Find existing itinerary for the day
    let itinerary = await this.itineraryRepository.findOne({
      where: { tripId, dayNumber },
    });

    if (!itinerary) {
      // Create new itinerary for the day
      itinerary = this.itineraryRepository.create({
        tripId,
        dayNumber,
        date: updateDto.date ? new Date(updateDto.date) : undefined,
        activities: updateDto.activities,
        aiGenerated: false,
        userModified: true,
      });
    } else {
      // Update existing itinerary
      itinerary.activities = updateDto.activities;
      itinerary.userModified = updateDto.userModified ?? true;
      if (updateDto.date) {
        itinerary.date = new Date(updateDto.date);
      }
    }

    return await this.itineraryRepository.save(itinerary);
  }

  /**
   * Get itinerary for a specific day
   */
  async getDayItinerary(
    tripId: string,
    dayNumber: number,
  ): Promise<ItineraryEntity | null> {
    return await this.itineraryRepository.findOne({
      where: { tripId, dayNumber },
    });
  }

  /**
   * Get all itinerary for a trip
   */
  async getTripItinerary(tripId: string): Promise<ItineraryEntity[]> {
    return await this.itineraryRepository.find({
      where: { tripId },
      order: { dayNumber: 'ASC' },
    });
  }

  /**
   * AI itinerary generation (placeholder implementation)
   * TODO: Integrate with OpenAI or other AI service
   */
  private generateAIItinerary(
    trip: TripEntity,
    tripDays: number,
    generateDto: GenerateItineraryDto,
  ): any[][] {
    // This is a placeholder implementation
    // In a real implementation, you would call an AI service like OpenAI
    // TODO: Use generateDto for preferences, interests, and budget preferences

    // Temporarily suppress unused parameter warning
    void generateDto;

    const sampleActivities = [
      {
        time: '09:00',
        title: 'Arrival and Check-in',
        description: 'Arrive at destination and check into accommodation',
        location: trip.destinationName,
        duration: 120,
        cost: 0,
        type: 'accommodation',
      },
      {
        time: '12:00',
        title: 'Lunch at Local Restaurant',
        description: 'Try local cuisine at a recommended restaurant',
        location: `Restaurant in ${trip.destinationName}`,
        duration: 90,
        cost: 25,
        type: 'dining',
      },
      {
        time: '14:30',
        title: 'City Center Tour',
        description: 'Explore the main attractions in the city center',
        location: `${trip.destinationName} City Center`,
        duration: 180,
        cost: 15,
        type: 'sightseeing',
      },
      {
        time: '18:00',
        title: 'Dinner',
        description: 'Evening meal with local specialties',
        location: trip.destinationName,
        duration: 120,
        cost: 35,
        type: 'dining',
      },
    ];

    const itinerary: any[][] = [];

    for (let day = 0; day < tripDays; day++) {
      // Generate different activities for each day
      const dayActivities = [...sampleActivities];

      // Modify activities based on day number
      if (day === 0) {
        dayActivities[0].title = 'Arrival and Orientation';
      } else if (day === tripDays - 1) {
        dayActivities[dayActivities.length - 1] = {
          time: '11:00',
          title: 'Departure',
          description: 'Check out and departure',
          location: trip.destinationName,
          duration: 60,
          cost: 0,
          type: 'transportation',
        };
      }

      itinerary.push(dayActivities);
    }

    // TODO: Implement actual AI integration
    // Example OpenAI integration:
    /*
    const prompt = `Generate a ${tripDays}-day itinerary for ${trip.destinationName}. 
                   Budget: ${trip.budget} ${trip.currency}
                   Preferences: ${generateDto.preferences}
                   Interests: ${generateDto.interests?.join(', ')}`;
    
    const response = await openai.createCompletion({
      model: 'gpt-3.5-turbo',
      prompt,
      max_tokens: 2000,
    });
    
    // Parse AI response and format into activities
    */

    return itinerary;
  }
}
