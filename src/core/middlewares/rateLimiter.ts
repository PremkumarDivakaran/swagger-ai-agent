/**
 * Rate Limiter Middleware
 * Implements rate limiting to protect against abuse
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  /** Request count in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Custom key generator (default: IP-based) */
  keyGenerator?: (req: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  /** Custom response when rate limit exceeded */
  handler?: (req: Request, res: Response) => void;
  /** Headers to include in response */
  headers?: boolean;
  /** Message when rate limit exceeded */
  message?: string;
}

/**
 * Default rate limiter configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  headers: true,
  message: 'Too many requests, please try again later.',
};

/**
 * In-memory rate limit store
 * For production, consider using Redis or similar
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Get or create entry for key
   */
  get(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      // New window
      const newEntry: RateLimitEntry = {
        count: 0,
        windowStart: now,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    return entry;
  }

  /**
   * Increment request count
   */
  increment(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.count++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart > maxAge) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Get store size (for testing/monitoring)
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    this.store.clear();
  }
}

/**
 * Global rate limit store instance
 */
const globalStore = new RateLimitStore();

/**
 * Get client identifier from request
 */
function getClientKey(req: Request): string {
  // Try to get real IP from proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ips.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Creates a rate limiter middleware
 * @param config - Rate limiter configuration
 * @returns Express middleware function
 */
export function rateLimiter(config: Partial<RateLimiterConfig> = {}) {
  const options: RateLimiterConfig = {
    ...DEFAULT_RATE_LIMIT_CONFIG,
    ...config,
  };

  const keyGenerator = options.keyGenerator || getClientKey;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if request should be skipped
    if (options.skip && options.skip(req)) {
      next();
      return;
    }

    const key = keyGenerator(req);
    const entry = globalStore.get(key, options.windowMs);
    
    // Calculate remaining requests and reset time
    const remaining = Math.max(0, options.maxRequests - entry.count - 1);
    const resetTime = entry.windowStart + options.windowMs;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    // Add rate limit headers if enabled
    if (options.headers) {
      res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    // Check if limit exceeded
    if (entry.count >= options.maxRequests) {
      if (options.headers) {
        res.setHeader('Retry-After', retryAfter.toString());
      }

      // Use custom handler if provided
      if (options.handler) {
        options.handler(req, res);
        return;
      }

      // Default response
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || DEFAULT_RATE_LIMIT_CONFIG.message!,
          details: {
            retryAfter,
            limit: options.maxRequests,
            windowMs: options.windowMs,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(429).json(response);
      return;
    }

    // Increment count and continue
    globalStore.increment(key);
    next();
  };
}

/**
 * Creates a rate limiter for specific routes/endpoints
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Window size in milliseconds
 * @returns Express middleware function
 */
export function createRouteRateLimiter(maxRequests: number, windowMs: number = 60000) {
  return rateLimiter({
    maxRequests,
    windowMs,
  });
}

/**
 * Rate limiter for API endpoints (100 requests/minute)
 */
export const apiRateLimiter = rateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  message: 'API rate limit exceeded. Please try again later.',
});

/**
 * Rate limiter for spec upload endpoints (10 requests/minute)
 */
export const uploadRateLimiter = rateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  message: 'Upload rate limit exceeded. Please wait before uploading another spec.',
});

/**
 * Rate limiter for LLM endpoints (20 requests/minute)
 */
export const llmRateLimiter = rateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000,
  message: 'LLM rate limit exceeded. Please wait before making another request.',
});

/**
 * Rate limiter for execution endpoints (30 requests/minute)
 */
export const executionRateLimiter = rateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  message: 'Execution rate limit exceeded. Please wait before executing more tests.',
});

/**
 * Get global rate limit store (for testing/monitoring)
 */
export function getRateLimitStore(): { size: () => number; reset: () => void } {
  return {
    size: () => globalStore.size(),
    reset: () => globalStore.reset(),
  };
}
