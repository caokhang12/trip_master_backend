export const AiTaskType = {
  GenerateItinerary: 'generate_itinerary',
  RegenerateDay: 'regenerate_day',
  SuggestActivitiesForDay: 'suggest_activities_day',
  RewriteDescription: 'rewrite_description',
  BudgetRebalance: 'budget_rebalance',
  OptimizeRouteOrder: 'optimize_route_order',
  PreviewItinerary: 'preview_itinerary',
} as const;

export type AiTaskType = (typeof AiTaskType)[keyof typeof AiTaskType];

export function normalizeAiTaskType(taskType?: string): AiTaskType {
  if (taskType === AiTaskType.PreviewItinerary)
    return AiTaskType.GenerateItinerary;
  const values = Object.values(AiTaskType) as string[];
  if (taskType && values.includes(taskType)) return taskType as AiTaskType;
  return AiTaskType.GenerateItinerary;
}
