/**
 * OpenAI Provider
 * 
 * Fallback LLM provider using OpenAI's API
 * - GPT-4, GPT-3.5-turbo
 * - Structured output with function calling
 */

import OpenAI from 'openai';
import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILogger } from '../logging';

export class OpenAiProvider implements ILlmProvider {
  public readonly name = 'openai';
  private client: OpenAI | null = null;
  private model: string;
  private apiKey: string | undefined;
  private logger: ILogger | null;

  constructor(logger?: ILogger) {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.logger = logger || null;
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey && !!this.client;
    this.logger?.debug(`[OpenAI] isAvailable: ${available}`, { model: this.model });
    return available;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY environment variable.');
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    this.logger?.debug(`[OpenAI] Calling chat.completions.create`, {
      model: this.model,
      messageCount: messages.length,
      maxTokens: request.maxTokens ?? 2000,
      promptLength: request.prompt.length,
    });

    const startTime = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 2000,
      });

      const latencyMs = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      this.logger?.info(`[OpenAI] ✅ Response received`, {
        model: this.model,
        tokensUsed,
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
      this.logger?.error(`[OpenAI] ❌ Request failed`, {
        error: (error.message || String(error)).substring(0, 200),
        latencyMs,
      });
      throw new Error(`OpenAI API error: ${error.message || error}`);
    }
  }
}
