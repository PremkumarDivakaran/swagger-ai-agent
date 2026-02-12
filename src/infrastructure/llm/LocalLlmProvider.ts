/**
 * Local LLM Provider
 * 
 * Final fallback using Ollama for local LLM inference
 * - LLaMA, CodeLLaMA, Mistral models
 * - Free but slower
 * - Requires Ollama running locally
 */

import axios from 'axios';
import { ILlmProvider, LlmRequest, LlmResponse } from '../../domain/services/llm';
import { ILogger } from '../logging';

export class LocalLlmProvider implements ILlmProvider {
  public readonly name = 'local';
  private baseUrl: string;
  private model: string;
  private logger: ILogger | null;

  constructor(logger?: ILogger) {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'codellama';
    this.logger = logger || null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      const available = response.status === 200;
      this.logger?.debug(`[Local] isAvailable: ${available}`, { baseUrl: this.baseUrl, model: this.model });
      return available;
    } catch {
      this.logger?.debug(`[Local] isAvailable: false (Ollama not running)`);
      return false;
    }
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    let fullPrompt = request.prompt;
    if (request.systemPrompt) {
      fullPrompt = `${request.systemPrompt}\n\n${request.prompt}`;
    }

    this.logger?.debug(`[Local] POST ${this.baseUrl}/api/generate`, {
      model: this.model,
      promptLength: fullPrompt.length,
    });

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.3,
            num_predict: request.maxTokens ?? 2000,
          },
        },
        { timeout: 120000 }
      );

      const latencyMs = Date.now() - startTime;
      const content = response.data.response || '';
      const tokensUsed = Math.ceil((content.length + fullPrompt.length) / 4);

      this.logger?.info(`[Local] ✅ Response received`, {
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
      if (error.code === 'ECONNREFUSED') {
        this.logger?.error(`[Local] ❌ Ollama not running`, { latencyMs });
        throw new Error('Ollama is not running. Start it with: ollama serve');
      }
      this.logger?.error(`[Local] ❌ Request failed`, {
        error: (error.message || String(error)).substring(0, 200),
        latencyMs,
      });
      throw new Error(`Local LLM error: ${error.message || error}`);
    }
  }
}
