/**
 * GroqLlmProvider
 * LLM provider implementation for Groq
 */

import axios, { AxiosInstance } from 'axios';
import {
  ILlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
} from './LlmProvider.interface';
import { ExternalServiceError } from '../../core/errors';

/**
 * Groq provider configuration
 */
export interface GroqProviderConfig {
  /** API key */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Base URL (optional, for proxies) */
  baseUrl?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Default Groq model
 */
const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/**
 * Groq API response structure
 */
interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * GroqLlmProvider class
 * Implements LLM provider for Groq API
 */
export class GroqLlmProvider implements ILlmProvider {
  readonly name = 'groq';
  private config: GroqProviderConfig;
  private client: AxiosInstance;

  constructor(config: GroqProviderConfig) {
    this.config = {
      ...config,
      model: config.model ?? DEFAULT_MODEL,
      baseUrl: config.baseUrl ?? 'https://api.groq.com/openai/v1',
      timeout: config.timeout ?? 60000,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ];
  }

  /**
   * Generate completion
   */
  async complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmCompletionResult> {
    try {
      const response = await this.client.post<GroqResponse>('/chat/completions', {
        model: this.config.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP ?? 1,
        stop: options?.stopSequences,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });

      const choice = response.data.choices[0];
      
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: response.data.model,
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 
                      choice.finish_reason === 'length' ? 'length' : 'error',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalServiceError(
        `Groq API error: ${message}`,
        'GroqLlmProvider'
      );
    }
  }

  /**
   * Generate simple text completion
   */
  async generateText(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    const result = await this.complete([
      { role: 'user', content: prompt },
    ], options);
    return result.content;
  }

  /**
   * Generate JSON completion
   */
  async generateJson<T = unknown>(prompt: string, options?: LlmCompletionOptions): Promise<T> {
    const result = await this.complete([
      { role: 'system', content: 'You are a helpful assistant that responds only with valid JSON.' },
      { role: 'user', content: prompt },
    ], {
      ...options,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(result.content) as T;
    } catch {
      throw new ExternalServiceError(
        `Failed to parse JSON response: ${result.content}`,
        'GroqLlmProvider'
      );
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - try to make a minimal request
      await this.client.post('/chat/completions', {
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.config.model ?? DEFAULT_MODEL;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.config.model = model;
  }
}

/**
 * Creates a GroqLlmProvider instance
 * @param config - Provider configuration
 * @returns GroqLlmProvider instance
 */
export function createGroqLlmProvider(config: GroqProviderConfig): GroqLlmProvider {
  return new GroqLlmProvider(config);
}
