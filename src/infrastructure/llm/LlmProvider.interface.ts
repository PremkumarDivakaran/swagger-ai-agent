/**
 * LLM Provider Interface
 * Defines the contract for LLM providers
 */

/**
 * LLM message role
 */
export type LlmMessageRole = 'system' | 'user' | 'assistant';

/**
 * LLM message
 */
export interface LlmMessage {
  role: LlmMessageRole;
  content: string;
}

/**
 * LLM completion options
 */
export interface LlmCompletionOptions {
  /** Temperature (0-1) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Top P sampling */
  topP?: number;
  /** Response format */
  responseFormat?: 'text' | 'json';
}

/**
 * LLM completion result
 */
export interface LlmCompletionResult {
  /** Generated content */
  content: string;
  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Model used */
  model: string;
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'error';
}

/**
 * LLM Provider interface
 */
export interface ILlmProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Get available models
   */
  getAvailableModels(): string[];

  /**
   * Generate completion
   * @param messages - Conversation messages
   * @param options - Completion options
   * @returns Completion result
   */
  complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmCompletionResult>;

  /**
   * Generate simple text completion
   * @param prompt - Text prompt
   * @param options - Completion options
   * @returns Generated text
   */
  generateText(prompt: string, options?: LlmCompletionOptions): Promise<string>;

  /**
   * Generate JSON completion
   * @param prompt - Text prompt
   * @param options - Completion options
   * @returns Parsed JSON object
   */
  generateJson<T = unknown>(prompt: string, options?: LlmCompletionOptions): Promise<T>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}
