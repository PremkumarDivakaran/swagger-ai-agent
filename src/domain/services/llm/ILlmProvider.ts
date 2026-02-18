/**
 * LLM Provider Interface
 * 
 * Common interface for all LLM providers (Groq, OpenAI, Custom)
 */

/**
 * Request to an LLM provider
 */
export interface LlmRequest {
  /** The main prompt/question to ask the LLM */
  prompt: string;
  /** System prompt to set context/role */
  systemPrompt?: string;
  /** Temperature for randomness (0-1, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** JSON schema for structured output (if supported) */
  schema?: object;
}

/**
 * Response from an LLM provider
 */
export interface LlmResponse {
  /** The generated content */
  content: string;
  /** Which provider generated this response */
  provider: string;
  /** Number of tokens used (for cost tracking) */
  tokensUsed: number;
  /** Whether this response was served from cache */
  cached: boolean;
}

/**
 * LLM Provider Interface
 * 
 * All LLM providers must implement this interface
 */
export interface ILlmProvider {
  /** Provider name (e.g., 'groq', 'openai', 'custom') */
  name: string;
  
  /**
   * Generate content using this provider
   */
  generate(request: LlmRequest): Promise<LlmResponse>;
  
  /**
   * Check if this provider is available/configured
   */
  isAvailable(): Promise<boolean>;
}


