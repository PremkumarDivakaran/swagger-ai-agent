/**
 * Anthropic Provider
 * 
 * Fallback LLM provider using Anthropic's Claude API
 * - Claude 3.5 Sonnet, Claude 3 Opus
 * - Excellent at code generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILogger } from '../logging';

export class AnthropicProvider implements ILlmProvider {
  public readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private model: string;
  private apiKey: string | undefined;
  private logger: ILogger | null;

  constructor(logger?: ILogger) {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    this.logger = logger || null;
    
    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey && !!this.client;
    this.logger?.debug(`[Anthropic] isAvailable: ${available}`, { model: this.model });
    return available;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.');
    }

    this.logger?.debug(`[Anthropic] Calling messages.create`, {
      model: this.model,
      maxTokens: request.maxTokens ?? 2000,
      promptLength: request.prompt.length,
    });

    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.3,
        system: request.systemPrompt,
        messages: [
          { role: 'user', content: request.prompt },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const content = message.content[0]?.type === 'text' 
        ? message.content[0].text 
        : '';
      const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

      this.logger?.info(`[Anthropic] ✅ Response received`, {
        model: this.model,
        tokensUsed,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        latencyMs,
        responseLength: content.length,
      });

      return {
        content,
        provider: this.name,
        tokensUsed,
        cached: false,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      this.logger?.error(`[Anthropic] ❌ Request failed`, {
        error: (error.message || String(error)).substring(0, 200),
        latencyMs,
      });
      throw new Error(`Anthropic API error: ${error.message || error}`);
    }
  }
}
