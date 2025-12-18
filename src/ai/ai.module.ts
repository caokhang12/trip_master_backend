import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { OpenRouterService } from './services/openrouter.service';
import { GeminiService } from './services/gemini.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { RedisModule } from '../redis/redis.module';
import { CacheService } from '../shared/services/cache.service';
import { GoogleMapsModule } from 'src/integrations/google-maps/google-maps.module';
import { PoiGroundingService } from 'src/ai/services/poi-grounding.service';
import { AiTelemetryService } from 'src/ai/services/ai-telemetry.service';
import { AiRunEntity } from 'src/schemas/ai-run.entity';

@Module({
  imports: [
    RedisModule,
    GoogleMapsModule,
    TypeOrmModule.forFeature([AiRunEntity]),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    OpenRouterService,
    GeminiService,
    PromptBuilderService,
    PoiGroundingService,
    CacheService,
    AiTelemetryService,
  ],
  exports: [AIService],
})
export class AIModule {}
