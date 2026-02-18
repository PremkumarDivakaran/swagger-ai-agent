/**
 * Custom Provider
 * 
 * Custom LLM provider using an OpenAI-compatible GPT-based API
 * - OpenAI-compatible chat/completions endpoint
 * - Uses gpt-4o-mini model
 * - Base URL: https://api.<provider>.com/ai/v1
 */

import axios, { AxiosInstance } from 'axios';
import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILogger } from '../logging';

export class CustomProvider implements ILlmProvider {
  public readonly name = 'custom';
  private client: AxiosInstance | null = null;
  private model: string;
  private apiKey: string | undefined;
  private baseUrl: string;
  private logger: ILogger | null;

  constructor(logger?: ILogger) {
    this.apiKey = process.env.CUSTOM_API_KEY;
    this.model = process.env.CUSTOM_MODEL || 'gpt-4o-mini';
    this.baseUrl = process.env.CUSTOM_BASE_URL || 'https://api.testleaf.com/ai/v1';
    this.logger = logger || null;

    if (this.apiKey) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: 120_000,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    const available = !!this.apiKey && !!this.client;
    this.logger?.debug(`[Custom] isAvailable: ${available}`, {
      hasApiKey: !!this.apiKey,
      model: this.model,
      baseUrl: this.baseUrl,
    });
    return available;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('Custom LLM client not initialized. Check CUSTOM_API_KEY environment variable.');
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    });

    this.logger?.debug(`[Custom] POST ${this.baseUrl}/chat/completions`, {
      model: this.model,
      messageCount: messages.length,
      temperature: request.temperature ?? 0.3,
      maxTokens: request.maxTokens ?? 4000,
      promptLength: request.prompt.length,
    });

    const startTime = Date.now();

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 4000,
      });

      const latencyMs = Date.now() - startTime;
      const rawData = response.data;

      // The API may wrap the OpenAI response inside transaction.response
      // Shape: { message: "...", transaction: { response: { choices, usage, ... } } }
      const openAiResponse = rawData?.transaction?.response || rawData;

      const content = openAiResponse?.choices?.[0]?.message?.content || '';
      const tokensUsed = openAiResponse?.usage?.total_tokens || 0;

      this.logger?.info(`[Custom] ✅ Response received`, {
        model: openAiResponse?.model || this.model,
        tokensUsed,
        promptTokens: openAiResponse?.usage?.prompt_tokens,
        completionTokens: openAiResponse?.usage?.completion_tokens,
        latencyMs,
        responseLength: content.length,
        finishReason: openAiResponse?.choices?.[0]?.finish_reason,
      });

      if (!content) {
        this.logger?.warn(`[Custom] ⚠️ Empty content — unexpected response shape`, {
          topLevelKeys: Object.keys(rawData || {}),
          hasTransaction: !!rawData?.transaction,
          hasResponse: !!rawData?.transaction?.response,
        });
      }

      return {
        content,
        provider: this.name,
        tokensUsed,
        cached: false,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = errorData?.error?.message || error.message || String(error);

      this.logger?.error(`[Custom] ❌ Request failed`, {
        statusCode,
        errorMessage: errorMessage.substring(0, 200),
        latencyMs,
        isTimeout: error.code === 'ECONNABORTED' || errorMessage.includes('timeout'),
        isRateLimit: statusCode === 429,
        url: `${this.baseUrl}/chat/completions`,
      });

      throw new Error(`Custom LLM API error: ${statusCode ? `${statusCode} ` : ''}${errorMessage}`);
    }
  }
}
