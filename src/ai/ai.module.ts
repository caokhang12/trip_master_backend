import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { OpenRouterService } from './services/openrouter.service';
import { GeminiService } from './services/gemini.service';
import { PromptBuilderService } from './services/prompt-builder.service';

@Module({
  controllers: [AIController],
  providers: [
    AIService,
    OpenRouterService,
    GeminiService,
    PromptBuilderService,
  ],
  exports: [AIService],
})
export class AIModule {}
