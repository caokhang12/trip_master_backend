import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PreviewItineraryDto } from './dto/preview-itinerary.dto';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AIService } from './services/ai.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('ai')
@ApiBearerAuth()
export class AIController {
  constructor(
    private promptBuilder: PromptBuilderService,
    private aiService: AIService,
  ) {}

  @Post('preview-itinerary')
  async previewItinerary(@Body() body: PreviewItineraryDto) {
    try {
      const prompt = this.promptBuilder.buildItineraryPrompt(body);
      const result =
        await this.aiService.generateItineraryWithOpenRouter(prompt);
      return { success: true, data: result };
    } catch (err: any) {
      throw new BadRequestException(err || 'AI preview failed');
    }
  }
}
