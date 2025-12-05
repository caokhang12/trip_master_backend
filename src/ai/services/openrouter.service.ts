import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IAIProvider } from '../interfaces/ai-provider.interface';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

@Injectable()
export class OpenRouterService implements IAIProvider {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly defaultModel = 'mistralai/mixtral-8x7b';

  constructor(private configService: ConfigService) {}

  async createChatCompletion(payload: any, apiKey?: string) {
    // Use provided apiKey, config value, or environment variable
    const key =
      apiKey ??
      this.configService.get<string>('openrouter.apiKey') ??
      process.env.OPENROUTER_API_KEY;

    if (!key) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Ensure model is set from config if not in payload
    if (!payload.model) {
      payload.model =
        this.configService.get<string>('openrouter.model') ?? this.defaultModel;
    }

    try {
      this.logger.debug(`OpenRouter request payload:`, {
        model: payload.model,
        messagesCount: payload.messages?.length,
      });

      const resp = await axios.post(this.endpoint, payload, {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'TripMaster',
        },
        timeout: 30_000,
      });
      return resp.data;
    } catch (err: any) {
      const errorData = {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        message: err?.message,
        data: err?.response?.data,
      };
      this.logger.error('OpenRouter request failed', errorData);
      throw err;
    }
  }
}
