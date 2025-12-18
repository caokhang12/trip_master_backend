/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiService implements IAIProvider {
  private readonly logger = new Logger(GeminiService.name);
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('gemini.apiKey');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY not set in config. Gemini service will fail at runtime.',
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async createChatCompletion(payload: any): Promise<any> {
    try {
      const model =
        payload.model ??
        this.configService.get<string>('gemini.model') ??
        'gemini-2.5-flash';

      // Extract prompt from messages
      const prompt = this.extractPrompt(payload.messages);

      // Call Gemini API with simple string prompt
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
      });

      // Transform response to OpenRouter-compatible format
      return this.transformResponse(response);
    } catch (err: any) {
      this.logger.error('Gemini request failed', {
        error: err?.message,
        status: err?.status,
        name: err?.name,
      });
      throw err;
    }
  }

  /**
   * Extract prompt string from OpenRouter-style messages array
   */
  private extractPrompt(messages: any[]): string {
    if (!messages || !Array.isArray(messages)) {
      return '';
    }

    // Get the last user message as the prompt
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    if (userMessages.length > 0) {
      return userMessages[userMessages.length - 1].content;
    }

    // Fallback: concatenate all non-system messages
    return messages
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => msg.content)
      .join('\n');
  }

  /**
   * Build Gemini-compatible contents from OpenRouter-style messages
   * Converts from [{ role: 'user'|'assistant'|'system', content: string }]
   * To Gemini format: [{ role: 'user'|'model', parts: [{ text: string }] }]
   */
  private buildContents(messages: any[]): any {
    if (!messages || !Array.isArray(messages)) {
      return '';
    }

    // If single user message, return just the text (SDK will wrap it)
    if (messages.length === 1 && messages[0]?.role === 'user') {
      return messages[0].content;
    }

    // For multiple messages, convert to proper format
    return messages
      .filter((msg: any) => msg.role !== 'system') // Gemini doesn't support system role in history
      .map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [
          {
            text: msg.content,
          },
        ],
      }));
  }

  /**
   * Transform Gemini SDK response to OpenRouter-compatible format
   * Based on official SDK documentation: response.text contains the generated text
   */
  private transformResponse(response: any): any {
    // According to SDK docs, GenerateContentResponse has a 'text' getter
    // that returns the text from candidates[0].content.parts[0].text
    const content = response?.text ?? '';

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content,
          },
          text: content,
        },
      ],
      usageMetadata: response?.usageMetadata,
    };
  }
}
