import type { JSONSchemaType } from 'ajv';
import type { GeneratedItinerary } from 'src/ai/dto/generated-itinerary.dto';
import { AiTaskType, normalizeAiTaskType } from './ai-task-type';
import { generateItinerarySchema } from './generate-itinerary.schema';

export function getSchemaForTaskType(taskType?: string): {
  resolvedTaskType: AiTaskType;
  schema: JSONSchemaType<GeneratedItinerary>;
} {
  const resolvedTaskType = normalizeAiTaskType(taskType);

  switch (resolvedTaskType) {
    case AiTaskType.GenerateItinerary:
      return { resolvedTaskType, schema: generateItinerarySchema };
    default:
      return {
        resolvedTaskType: AiTaskType.GenerateItinerary,
        schema: generateItinerarySchema,
      };
  }
}
