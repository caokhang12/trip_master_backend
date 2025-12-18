import { Injectable } from '@nestjs/common';
import { PreviewItineraryDto } from '../dto/preview-itinerary.dto';
import { AiTaskType, normalizeAiTaskType } from 'src/ai/schemas/ai-task-type';

@Injectable()
export class PromptBuilderService {
  buildPrompt(taskType: string, input: PreviewItineraryDto): string {
    const resolved = normalizeAiTaskType(taskType);
    switch (resolved) {
      case AiTaskType.GenerateItinerary:
        return this.buildItineraryPrompt(input);
      default:
        return this.buildItineraryPrompt(input);
    }
  }

  buildItineraryPrompt(input: PreviewItineraryDto) {
    const {
      destination,
      startDate,
      endDate,
      budget,
      currency,
      travelers,
      preferences,
    } = input;

    const base: string[] = [];
    base.push(
      'You are a travel assistant. Produce a detailed itinerary and return in English-only JSON.',
    );
    base.push(
      'Must: return exactly one JSON object, no markdown, no code fences, no preamble or epilogue.',
    );
    base.push(
      'JSON format: {"days":[{"dayNumber":1,"date":"YYYY-MM-DD" | null,"activities":[{"time":"HH:MM" | null,"title":"string","description":"string" | null,"durationMinutes":number | null,"cost":number | null,"currency":"ISO" | null}]}],"totalCost":number | null,"currency":"ISO" | null,"notes":["string"] | null}',
    );

    const params: string[] = [];
    if (destination) params.push(`Destination: ${destination}`);
    if (startDate) params.push(`Start date: ${startDate}`);
    if (endDate) params.push(`End date: ${endDate}`);
    if (budget !== undefined && budget !== null)
      params.push(`Budget: ${budget} ${currency ?? 'VND'}`);
    if (travelers !== undefined && travelers !== null)
      params.push(`Travelers: ${travelers}`);
    if (preferences) {
      if (preferences.travelStyle)
        params.push(`Travel style: ${preferences.travelStyle}`);
      if (preferences.interests && Array.isArray(preferences.interests))
        params.push(`Interests: ${preferences.interests.join(', ')}`);
    }

    if (params.length > 0) {
      base.push('Input: ' + params.join(' | '));
    }

    base.push(
      'Per day: dayNumber (1..N), date (YYYY-MM-DD or null), activities[] with time, title, description, durationMinutes, cost, currency.',
    );
    base.push(
      'Compute totalCost and use the provided currency if given; otherwise default to USD.',
    );
    base.push(
      'Explainability: include notes[] (3-6 short strings) describing why the itinerary was structured this way (e.g., pacing, budget, interests). If unsure, set notes to null.',
    );

    return base.join('\n');
  }
}
