import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './services/ai.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { APIThrottleService } from '../shared/services/api-throttle.service';

/**
 * Module for AI-powered travel planning features
 * Provides OpenAI integration with country-aware prompt engineering
 */
@Module({
  imports: [ConfigModule],
  providers: [AIService, PromptBuilderService, APIThrottleService],
  exports: [AIService, PromptBuilderService, APIThrottleService],
})
export class AIModule {}
