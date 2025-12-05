export interface IAIProvider {
  /**
   * Make a chat completion request to the AI provider
   * @param payload The request payload containing model, messages, and other parameters
   * @param apiKey Optional API key to override the configured one
   * @returns The provider response
   */
  createChatCompletion(payload: any, apiKey?: string): Promise<any>;
}
