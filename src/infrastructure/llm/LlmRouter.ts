/**
 * LLM Router
 * 
 * Routes LLM requests to available providers with automatic fallback
 * - Tries providers in configured order
 * - Falls back to next provider on failure
 * - Uses cache to avoid duplicate requests
 * - Structured logging at all levels (debug/info/warn/error)
 */

import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILlmCache, LlmCache } from './LlmCache';
import { ILogger } from '../logging';

export class LlmRouter {
  private providers: ILlmProvider[];
  private cache: ILlmCache;
  private logger: ILogger | null;
  /** The provider that handled the last successful request */
  private _lastProvider: string = '';

  constructor(providers: ILlmProvider[], cache?: ILlmCache, logger?: ILogger) {
    this.providers = providers;
    this.cache = cache || new LlmCache();
    this.logger = logger || null;
  }

  /** Get the name of the provider that handled the last request */
  get lastProvider(): string {
    return this._lastProvider;
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const promptSnippet = request.prompt.substring(0, 80).replace(/\n/g, ' ');
    const startTime = Date.now();

    this.logger?.debug('[LlmRouter] Generate request', {
      promptSnippet: `${promptSnippet}...`,
      systemPrompt: request.systemPrompt?.substring(0, 60),
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    // Check cache first
    const cached = await this.cache.get(request);
    if (cached) {
      this._lastProvider = `${cached.provider} (cached)`;
      this.logger?.debug('[LlmRouter] Cache HIT', {
        provider: cached.provider,
        tokensUsed: cached.tokensUsed,
      });
      return cached;
    }
    this.logger?.debug('[LlmRouter] Cache MISS — trying providers');

    // Try each provider in order
    const errors: Array<{ provider: string; error: string }> = [];
    
    for (const provider of this.providers) {
      try {
        // Check if provider is available
        const available = await provider.isAvailable();
        if (!available) {
          this.logger?.debug(`[LlmRouter] Provider ${provider.name} not available, skipping`);
          continue;
        }

        this.logger?.info(`[LlmRouter] Trying provider: ${provider.name}`, {
          provider: provider.name,
          maxTokens: request.maxTokens,
        });

        const providerStart = Date.now();
        const response = await provider.generate(request);
        const latencyMs = Date.now() - providerStart;
        
        // Cache the successful response
        await this.cache.set(request, response);

        this._lastProvider = provider.name;
        this.logger?.info(`[LlmRouter] ✅ Success`, {
          provider: provider.name,
          tokensUsed: response.tokensUsed,
          latencyMs,
          totalTimeMs: Date.now() - startTime,
        });
        return response;
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        const latencyMs = Date.now() - startTime;

        // Detect rate limit errors specifically
        const isRateLimit = errorMsg.includes('429') || errorMsg.includes('rate_limit');
        const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT');

        this.logger?.warn(`[LlmRouter] Provider ${provider.name} FAILED`, {
          provider: provider.name,
          errorType: isRateLimit ? 'RATE_LIMIT' : isTimeout ? 'TIMEOUT' : 'API_ERROR',
          error: errorMsg.substring(0, 200),
          latencyMs,
        });

        errors.push({
          provider: provider.name,
          error: errorMsg,
        });
        continue;
      }
    }

    // All providers failed
    const errorDetails = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
    this.logger?.error('[LlmRouter] ALL providers failed', {
      providersAttempted: errors.map(e => e.provider),
      errors: errors.map(e => ({ provider: e.provider, error: e.error.substring(0, 150) })),
      totalTimeMs: Date.now() - startTime,
    });

    throw new Error(
      `All LLM providers failed. Errors: ${errorDetails}`
    );
  }

  /**
   * Get list of available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        available.push(provider.name);
      }
    }
    
    return available;
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}
