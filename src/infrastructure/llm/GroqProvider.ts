/**
 * Groq Provider (PRIMARY/DEFAULT)
 * 
 * Fast and cost-effective LLM provider using Groq's inference API
 * - LLaMA 3.1 70B, Mixtral 8x7B, Gemma 2 9B
 * - 800+ tokens/second (10x faster than OpenAI)
 * - $0.05-0.27 per 1M tokens
 */

import Groq from 'groq-sdk';
import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILogger } from '../logging';

export class GroqProvider implements ILlmProvider {
  public readonly name = 'groq';
  private client: Groq | null = null;
  private model: string;
  private apiKey: string | undefined;
  private logger: ILogger | null;

  constructor(logger?: ILogger) {
    this.apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
    this.logger = logger || null;
    
    if (this.apiKey) {
      this.client = new Groq({
        apiKey: this.apiKey,
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey && !!this.client;
    this.logger?.debug(`[Groq] isAvailable: ${available}`, { model: this.model });
    return available;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('Groq client not initialized. Check GROQ_API_KEY environment variable.');
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    this.logger?.debug(`[Groq] Calling chat.completions.create`, {
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

      this.logger?.info(`[Groq] ✅ Response received`, {
        model: this.model,
        tokensUsed,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
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
      this.logger?.error(`[Groq] ❌ Request failed`, {
        error: (error.message || String(error)).substring(0, 200),
        latencyMs,
        isRateLimit: error.status === 429 || (error.message || '').includes('429'),
      });
      throw new Error(`Groq API error: ${error.message || error}`);
    }
  }
}
