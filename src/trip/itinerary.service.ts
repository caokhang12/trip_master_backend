import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripEntity } from '../schemas/trip.entity';
import { ActivityCostEntity } from '../schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../schemas/budget-tracking.entity';
import {
  UpdateItineraryDto,
  GenerateItineraryOptionsDto,
} from './dto/itinerary.dto';
import {
  ActivityCostDto,
  UpdateActivityCostDto,
  CostAnalysisDto,
  BudgetSummaryDto,
  BudgetCategoryDto,
} from './dto/cost.dto';
import {
  LocationSuggestionsDto,
  CostEstimationDto,
} from './dto/ai-request.dto';
import {
  CostEstimationResponseDto,
  LocationSuggestionDto,
} from './dto/ai-response.dto';
import { CurrencyService } from '../currency/services/currency.service';
import { AIService } from '../shared/services/ai.service';
import { TripValidationUtil } from '../shared/utils/trip-validation.util';
import {
  ActivityWithCosts,
  ItineraryWithCosts,
} from './interfaces/trip.interface';
import {
  SaveGeneratedItineraryDto,
  SaveItineraryResponseDto,
} from './dto/save-itinerary.dto';

/**
 * Service for managing trip itineraries and AI integration with cost tracking
 */
@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
    @InjectRepository(ActivityCostEntity)
    private readonly activityCostRepository: Repository<ActivityCostEntity>,
    @InjectRepository(BudgetTrackingEntity)
    private readonly budgetTrackingRepository: Repository<BudgetTrackingEntity>,
    private readonly currencyService: CurrencyService,
    private readonly aiService: AIService,
  ) {}

  /**
   * Helper method to format currency values
   */
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Generate AI-powered itinerary for a trip with cost estimation
   */
  async generateItinerary(
    tripId: string,
    userId: string,
    generateDto: GenerateItineraryOptionsDto = {},
  ): Promise<ItineraryWithCosts[]> {
    // Validate trip ownership and dates
    const trip = await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
    );

    TripValidationUtil.validateTripDates(trip);

    if (!trip.destinationName) {
      throw new BadRequestException(
        'Trip must have a destination for itinerary generation',
      );
    }

    // Validate dates exist (additional check after validateTripDates)
    if (!trip.startDate || !trip.endDate) {
      throw new BadRequestException(
        'Trip must have valid start and end dates for itinerary generation',
      );
    }

    // Calculate trip duration - dates are guaranteed to exist after validation
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

    // Save generated itinerary with cost estimation
    const savedItinerary: ItineraryWithCosts[] = [];
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

      // Add cost estimation if cost tracking is enabled
      let enhancedItinerary: ItineraryWithCosts;
      if (trip.enableCostTracking) {
        enhancedItinerary = await this.addCostEstimationToDay(saved, trip);
      } else {
        enhancedItinerary = saved as ItineraryWithCosts;
      }

      savedItinerary.push(enhancedItinerary);
    }

    // Update trip budget tracking if cost tracking is enabled
    if (trip.enableCostTracking) {
      await this.updateTripBudgetTracking(tripId);
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
    await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
    );

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
        activities: updateDto.activities || [],
        aiGenerated: false,
        userModified: true,
      });
    } else {
      // Update existing itinerary
      if (updateDto.activities) {
        itinerary.activities = updateDto.activities;
      }
      itinerary.userModified = updateDto.userModified ?? true;
      if (updateDto.date) {
        itinerary.date = new Date(updateDto.date);
      }
    }

    return await this.itineraryRepository.save(itinerary);
  }

  /**
   * Find itinerary for a specific day
   */
  async findDayItinerary(
    tripId: string,
    dayNumber: number,
  ): Promise<ItineraryEntity | null> {
    return await this.itineraryRepository.findOne({
      where: { tripId, dayNumber },
    });
  }

  /**
   * Find all itineraries for a trip
   */
  async findTripItineraries(tripId: string): Promise<ItineraryEntity[]> {
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
    generateDto: GenerateItineraryOptionsDto,
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

  /**
   * Add cost estimation to a day's itinerary
   */
  private async addCostEstimationToDay(
    itinerary: ItineraryEntity,
    trip: TripEntity,
  ): Promise<ItineraryWithCosts> {
    const activitiesWithCosts: ActivityWithCosts[] = [];
    let totalEstimatedCost = 0;

    const activities = itinerary.activities as ActivityWithCosts[];
    for (let index = 0; index < activities.length; index++) {
      const activity = activities[index];

      // Get cost estimation from AI service
      const costEstimate = this.aiService.estimateActivityCost(
        activity,
        trip.destinationCountry || trip.destinationName,
        trip.currency,
      );

      // Create activity cost entity with correct field names
      const activityCost = this.activityCostRepository.create({
        itineraryId: itinerary.id,
        activityIndex: index,
        costType: costEstimate.category,
        estimatedAmount: costEstimate.estimatedCost,
        currency: trip.currency,
      });

      await this.activityCostRepository.save(activityCost);

      // Add cost information to activity
      const activityWithCost: ActivityWithCosts = {
        ...activity,
        costEstimate: {
          costType: costEstimate.category,
          estimatedAmount: costEstimate.estimatedCost,
          currency: trip.currency,
          breakdown: costEstimate.breakdown,
        } as ActivityCostDto,
      };

      activitiesWithCosts.push(activityWithCost);
      totalEstimatedCost += costEstimate.estimatedCost;
    }

    // Update itinerary with total estimated cost
    itinerary.estimatedCost = totalEstimatedCost;
    itinerary.costCurrency = trip.currency;
    await this.itineraryRepository.save(itinerary);

    return {
      ...itinerary,
      activities: activitiesWithCosts,
    } as ItineraryWithCosts;
  }

  /**
   * Update actual cost for a specific activity
   */
  async updateActivityCost(
    tripId: string,
    userId: string,
    activityCostId: string,
    updateDto: UpdateActivityCostDto,
  ): Promise<ActivityCostEntity> {
    // Validate trip ownership
    const trip = await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
      true, // throw NotFoundException
    );

    // Find activity cost
    const activityCost = await this.activityCostRepository.findOne({
      where: { id: activityCostId },
      relations: ['itinerary'],
    });

    if (!activityCost || activityCost.itinerary.tripId !== tripId) {
      throw new NotFoundException('Activity cost not found');
    }

    // Update activity cost with correct field names
    activityCost.actualAmount = updateDto.actualAmount;
    activityCost.notes = updateDto.notes;

    const saved = await this.activityCostRepository.save(activityCost);

    // Update itinerary total costs
    await this.updateItineraryCosts(activityCost.itineraryId);

    // Update trip budget tracking
    if (trip.enableCostTracking) {
      await this.updateTripBudgetTracking(tripId);
    }

    return saved;
  }

  /**
   * Get cost analysis for a trip
   */
  async getCostAnalysis(
    tripId: string,
    userId: string,
  ): Promise<CostAnalysisDto> {
    // Validate trip ownership
    const trip = await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
      true, // throw NotFoundException
    );

    if (!trip.enableCostTracking) {
      throw new BadRequestException(
        'Cost tracking is not enabled for this trip',
      );
    }

    // Get all itineraries with cost data
    const itineraries = await this.itineraryRepository
      .createQueryBuilder('itinerary')
      .leftJoinAndSelect('itinerary.activityCosts', 'activityCost')
      .where('itinerary.tripId = :tripId', { tripId })
      .orderBy('itinerary.dayNumber', 'ASC')
      .getMany();

    // Calculate totals
    let totalEstimated = 0;
    let totalActual = 0;
    const categoryBreakdown: Record<
      string,
      { estimated: number; actual: number }
    > = {};
    const dailyCosts: Array<{
      day: number;
      estimated: number;
      actual: number;
    }> = [];

    for (const itinerary of itineraries) {
      let dayEstimated = itinerary.estimatedCost || 0;
      let dayActual = itinerary.actualCost || 0;

      // Calculate from activity costs if available
      if (itinerary.activityCosts && itinerary.activityCosts.length > 0) {
        dayEstimated = itinerary.activityCosts.reduce(
          (sum, ac) => sum + (ac.estimatedAmount || 0),
          0,
        );
        dayActual = itinerary.activityCosts.reduce(
          (sum, ac) => sum + (ac.actualAmount || 0),
          0,
        );

        // Category breakdown
        for (const activityCost of itinerary.activityCosts) {
          const category = activityCost.costType;
          if (!categoryBreakdown[category]) {
            categoryBreakdown[category] = { estimated: 0, actual: 0 };
          }
          categoryBreakdown[category].estimated +=
            activityCost.estimatedAmount || 0;
          categoryBreakdown[category].actual += activityCost.actualAmount || 0;
        }
      }

      totalEstimated += dayEstimated;
      totalActual += dayActual;

      dailyCosts.push({
        day: itinerary.dayNumber,
        estimated: dayEstimated,
        actual: dayActual,
      });
    }

    // Budget utilization
    const budgetUtilization =
      trip.budget && trip.budget > 0 ? (totalActual / trip.budget) * 100 : 0;

    return {
      tripId: tripId,
      totalBudget: trip.budget || 0,
      totalEstimated: totalEstimated,
      totalSpent: totalActual,
      remainingBudget: Math.max(0, (trip.budget || 0) - totalActual),
      budgetVariance: totalActual - (trip.budget || 0),
      utilizationPercentage: Math.round(budgetUtilization * 100) / 100,
      currency: trip.currency,
      categoryBreakdown: Object.entries(categoryBreakdown).map(
        ([category, costs]) => ({
          category,
          budgeted: costs.estimated, // Use estimated as budgeted for now
          estimated: costs.estimated,
          actual: costs.actual,
          variance: Math.abs(costs.actual - costs.estimated),
          utilizationPercentage:
            costs.estimated > 0
              ? Math.round((costs.actual / costs.estimated) * 10000) / 100
              : 0,
        }),
      ),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get budget summary for a trip
   */
  async getBudgetSummary(
    tripId: string,
    userId: string,
  ): Promise<BudgetSummaryDto> {
    // Validate trip ownership
    const trip = await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
      true, // throw NotFoundException
    );

    if (!trip.enableCostTracking) {
      throw new BadRequestException(
        'Cost tracking is not enabled for this trip',
      );
    }

    // Get budget tracking data - since entity structure is different, let's simplify
    const budgetTrackingEntries = await this.budgetTrackingRepository.find({
      where: { tripId },
    });

    if (!budgetTrackingEntries || budgetTrackingEntries.length === 0) {
      throw new NotFoundException('Budget tracking data not found');
    }

    // Calculate totals from individual budget tracking entries
    let totalSpent = 0;
    const categoryUtilization: BudgetCategoryDto[] = [];

    for (const entry of budgetTrackingEntries) {
      totalSpent += entry.spentAmount;

      const utilization =
        entry.budgetedAmount > 0
          ? (entry.spentAmount / entry.budgetedAmount) * 100
          : 0;

      categoryUtilization.push({
        category: entry.category,
        budgeted: entry.budgetedAmount,
        estimated: entry.budgetedAmount, // Use budgeted as estimated for now
        actual: entry.spentAmount,
        variance: Math.abs(entry.spentAmount - entry.budgetedAmount),
        utilizationPercentage: Math.round(utilization * 100) / 100,
      });
    }

    // Overall budget utilization
    const overallUtilization =
      trip.budget && trip.budget > 0 ? (totalSpent / trip.budget) * 100 : 0;

    return {
      totalBudget: trip.budget || 0,
      totalSpent: totalSpent,
      totalEstimated: totalSpent, // Use totalSpent as estimated for now
      remainingBudget: Math.max(0, (trip.budget || 0) - totalSpent),
      budgetUtilization: Math.round(overallUtilization * 100) / 100,
      currency: trip.currency,
      categoryBreakdown: categoryUtilization,
      lastUpdated: new Date(), // Use current date since we don't have a single updated date
    };
  }

  /**
   * Generate AI-powered location suggestions
   */
  async generateLocationSuggestions(
    tripId: string,
    userId: string,
    suggestionsDto: LocationSuggestionsDto,
  ): Promise<LocationSuggestionDto[]> {
    // Validate trip ownership
    await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
    );

    try {
      const suggestions = await this.aiService.generateLocationSuggestions(
        suggestionsDto.location,
        suggestionsDto.travelStyle,
        suggestionsDto.budget,
        suggestionsDto.interests,
      );

      return suggestions as LocationSuggestionDto[];
    } catch (error) {
      this.logger.error(
        `Failed to generate location suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Failed to generate location suggestions');
    }
  }

  /**
   * Generate AI-powered cost estimation
   */
  async generateCostEstimation(
    tripId: string,
    userId: string,
    costDto: CostEstimationDto,
  ): Promise<CostEstimationResponseDto> {
    // Validate trip ownership
    await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
    );

    try {
      const estimation = await this.aiService.generateCostEstimation(
        costDto.destination,
        costDto.activityType,
        costDto.duration,
        costDto.travelers || 1,
        costDto.travelStyle || 'mid-range',
        userId,
      );

      return estimation;
    } catch (error) {
      this.logger.error(
        `Failed to generate cost estimation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Failed to generate cost estimation');
    }
  }

  /**
   * Update itinerary costs based on activity costs
   */
  private async updateItineraryCosts(itineraryId: string): Promise<void> {
    const activityCosts = await this.activityCostRepository.find({
      where: { itineraryId },
    });

    const totalEstimated = activityCosts.reduce(
      (sum, ac) => sum + (ac.estimatedAmount || 0),
      0,
    );
    const totalActual = activityCosts.reduce(
      (sum, ac) => sum + (ac.actualAmount || 0),
      0,
    );

    await this.itineraryRepository.update(itineraryId, {
      estimatedCost: totalEstimated,
      actualCost: totalActual,
    });
  }

  /**
   * Update trip budget tracking
   */
  private async updateTripBudgetTracking(tripId: string): Promise<void> {
    // Get all activity costs for the trip
    const activityCosts = await this.activityCostRepository
      .createQueryBuilder('activityCost')
      .leftJoin('activityCost.itinerary', 'itinerary')
      .where('itinerary.tripId = :tripId', { tripId })
      .getMany();

    // Calculate actual spent by category
    const actualSpentByCategory: Record<string, number> = {};
    for (const activityCost of activityCosts) {
      const category = activityCost.costType;
      if (!actualSpentByCategory[category]) {
        actualSpentByCategory[category] = 0;
      }
      actualSpentByCategory[category] += activityCost.actualAmount || 0;
    }

    // Update budget tracking entries
    for (const [category, spentAmount] of Object.entries(
      actualSpentByCategory,
    )) {
      const existingEntry = await this.budgetTrackingRepository.findOne({
        where: { tripId, category },
      });

      if (existingEntry) {
        existingEntry.spentAmount = spentAmount;
        await this.budgetTrackingRepository.save(existingEntry);
      }
    }
  }

  /**
   * Save generated AI itinerary to database if user chooses to
   */
  async saveGeneratedItinerary(
    tripId: string,
    userId: string,
    saveDto: SaveGeneratedItineraryDto,
  ): Promise<SaveItineraryResponseDto> {
    // If user chose not to save, return appropriate response
    if (!saveDto.saveToDatabase) {
      return {
        saved: false,
        message: 'Itinerary not saved as per user preference',
      };
    }

    // Validate trip ownership
    const trip = await TripValidationUtil.validateTripOwnership(
      this.tripRepository,
      tripId,
      userId,
    );

    // Clear existing itinerary if any
    await this.itineraryRepository.delete({ tripId });

    const itineraryIds: string[] = [];

    try {
      // Save each day's itinerary
      for (const day of saveDto.itinerary.days) {
        const itineraryEntity = this.itineraryRepository.create({
          tripId,
          dayNumber: day.dayNumber,
          date: new Date(day.date),
          activities: day.activities,
          aiGenerated: true, // This is AI-generated
          userModified: false,
          estimatedCost: day.dailyBudget || 0,
          costCurrency: saveDto.itinerary.currency || 'VND',
        });

        const saved = await this.itineraryRepository.save(itineraryEntity);
        itineraryIds.push(saved.id);

        // Create activity costs for each activity with estimated costs
        for (
          let activityIndex = 0;
          activityIndex < day.activities.length;
          activityIndex++
        ) {
          const activity = day.activities[activityIndex];
          if (activity.estimatedCost && activity.estimatedCost > 0) {
            const activityCost = this.activityCostRepository.create({
              itineraryId: saved.id,
              activityIndex,
              costType: activity.category || 'activities',
              estimatedAmount: activity.estimatedCost,
              currency: saveDto.itinerary.currency || 'VND',
              costSource: 'AI_GENERATED',
              notes: `AI estimated cost for ${activity.name}`,
            });

            await this.activityCostRepository.save(activityCost);
          }
        }
      }

      // Update trip with total estimated cost
      if (saveDto.itinerary.totalEstimatedCost) {
        trip.budget = saveDto.itinerary.totalEstimatedCost;
        trip.currency = saveDto.itinerary.currency || 'VND';
        await this.tripRepository.save(trip);
      }

      this.logger.log(
        `Saved AI-generated itinerary for trip ${tripId} with ${itineraryIds.length} days`,
      );

      return {
        saved: true,
        message: `Itinerary saved successfully with ${itineraryIds.length} days`,
        itineraryIds,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save AI-generated itinerary for trip ${tripId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      // Cleanup partially saved data
      if (itineraryIds.length > 0) {
        await this.itineraryRepository.delete(itineraryIds);
      }

      throw new BadRequestException('Failed to save itinerary to database');
    }
  }
}
