import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './services/ai.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { ContextBuilderService } from './services/context-builder.service';
import { PreferencesModule } from 'src/preferences/preferences.module';

/**
 * Module for AI-powered travel planning features
 * Provides OpenAI integration with country-aware prompt engineering
 */
@Module({
  imports: [ConfigModule, PreferencesModule],
  providers: [
    AIService,
    PromptBuilderService,
    APIThrottleService,
    ContextBuilderService,
  ],
  exports: [
    AIService,
    PromptBuilderService,
    APIThrottleService,
    ContextBuilderService,
  ],
})
export class AIModule {}
