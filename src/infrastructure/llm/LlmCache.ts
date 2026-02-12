/**
 * LLM Cache
 * 
 * File-based cache for LLM responses to avoid duplicate costs
 * - Uses MD5 hash of request as cache key
 * - Persists to disk for cross-session caching
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LlmRequest, LlmResponse } from '../../domain/services/llm';

export interface ILlmCache {
  get(request: LlmRequest): Promise<LlmResponse | null>;
  set(request: LlmRequest, response: LlmResponse): Promise<void>;
  clear(): Promise<void>;
}

export class LlmCache implements ILlmCache {
  private cacheDir: string;
  private enabled: boolean;

  constructor() {
    this.cacheDir = process.env.LLM_CACHE_DIR || '.cache/llm';
    this.enabled = process.env.LLM_CACHE_ENABLED !== 'false';
    
    // Create cache directory if it doesn't exist
    if (this.enabled) {
      this.ensureCacheDir();
    }
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheKey(request: LlmRequest): string {
    // Create a unique key based on the request parameters
    const key = JSON.stringify({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      schema: request.schema,
    });
    
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private getCacheFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  async get(request: LlmRequest): Promise<LlmResponse | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(request);
      const filePath = this.getCacheFilePath(cacheKey);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const cached = JSON.parse(data) as LlmResponse;
      
      // Mark as cached
      cached.cached = true;
      
      console.log(`[LlmCache] Cache hit for key: ${cacheKey}`);
      return cached;
    } catch (error) {
      console.warn('[LlmCache] Error reading cache:', error);
      return null;
    }
  }

  async set(request: LlmRequest, response: LlmResponse): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const cacheKey = this.getCacheKey(request);
      const filePath = this.getCacheFilePath(cacheKey);

      fs.writeFileSync(filePath, JSON.stringify(response, null, 2), 'utf-8');
      console.log(`[LlmCache] Cached response for key: ${cacheKey}`);
    } catch (error) {
      console.warn('[LlmCache] Error writing cache:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
        console.log(`[LlmCache] Cleared ${files.length} cached responses`);
      }
    } catch (error) {
      console.warn('[LlmCache] Error clearing cache:', error);
    }
  }
}


