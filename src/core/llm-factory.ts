/**
 * LLM Factory
 * 
 * Creates a single LLM provider based on LLM_PROVIDER env variable.
 * No fallback cascade — one provider is selected and used for all calls.
 * 
 * Phase 1 supported providers:
 *   - custom    → Custom GPT API (https://api.<provider>.com/ai/v1)
 *   - groq      → Groq API (https://api.groq.com/openai/v1)
 *   - openai    → OpenAI API (https://api.openai.com/v1)
 */

import { ILlmProvider } from '../domain/services/llm';
import {
  GroqProvider,
  OpenAiProvider,
  CustomProvider,
  LlmRouter,
  LlmCache,
} from '../infrastructure/llm';
import { ILogger } from '../infrastructure/logging';

export interface LlmFactoryConfig {
  /** Whether LLM features are enabled */
  enabled: boolean;
  /** The single provider to use (custom | groq | openai) */
  provider: string;
  /** Logger instance */
  logger?: ILogger;
}

/** Supported providers in Phase 1 */
const SUPPORTED_PROVIDERS = ['custom', 'groq', 'openai'] as const;
type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export class LlmFactory {
  /**
   * Create LLM router with the selected provider.
   * Only ONE provider is initialized — no fallback chain.
   */
  static createLlmRouter(config: LlmFactoryConfig): LlmRouter | null {
    if (!config.enabled) {
      config.logger?.info('[LlmFactory] LLM features disabled');
      return null;
    }

    const providerName = config.provider.toLowerCase();

    // Validate provider name
    if (!SUPPORTED_PROVIDERS.includes(providerName as SupportedProvider)) {
      config.logger?.error(`[LlmFactory] Unknown provider: "${config.provider}"`, {
        supported: SUPPORTED_PROVIDERS,
      });
      return null;
    }

    // Create the single provider
    const provider = this.createProvider(providerName, config.logger);
    if (!provider) {
      config.logger?.error(`[LlmFactory] Failed to create provider: ${providerName}`);
      return null;
    }

    config.logger?.info(`[LlmFactory] LLM provider initialized: ${providerName}`, {
      provider: providerName,
    });

    const cache = new LlmCache();
    return new LlmRouter([provider], cache, config.logger);
  }

  /**
   * Create a provider by name.
   * Endpoints are hardcoded in each provider — only API keys come from .env.
   */
  private static createProvider(name: string, logger?: ILogger): ILlmProvider | null {
    try {
      switch (name) {
        case 'custom':
          // Endpoint: https://api.<provider>.com/ai/v1
          // Key: CUSTOM_API_KEY, Model: CUSTOM_MODEL
          return new CustomProvider(logger);

        case 'groq':
          // Endpoint: https://api.groq.com/openai/v1 (via groq-sdk)
          // Key: GROQ_API_KEY, Model: GROQ_MODEL
          return new GroqProvider(logger);

        case 'openai':
          // Endpoint: https://api.openai.com/v1 (via openai SDK)
          // Key: OPENAI_API_KEY, Model: OPENAI_MODEL
          return new OpenAiProvider(logger);

        default:
          logger?.error(`[LlmFactory] Unsupported provider: ${name}`, {
            supported: SUPPORTED_PROVIDERS,
          });
          return null;
      }
    } catch (error: any) {
      logger?.error(`[LlmFactory] Error creating provider ${name}`, {
        error: error.message,
      });
      return null;
    }
  }
}
