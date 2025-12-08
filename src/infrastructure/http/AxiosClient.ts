/**
 * AxiosClient
 * Wrapper around Axios for making HTTP requests with retry and timeout support
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ExternalServiceError } from '../../core/errors';
import { HttpMethod } from '../../domain/models';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  retryDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Maximum delay between retries in milliseconds */
  maxRetryDelay: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: number[];
  /** Whether to retry on network errors */
  retryOnNetworkError: boolean;
  /** Whether to retry on timeout */
  retryOnTimeout: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
  retryOnTimeout: true,
};

/**
 * Request configuration
 */
export interface HttpRequestConfig {
  /** Full URL */
  url: string;
  /** HTTP method */
  method: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request body */
  data?: unknown;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to validate SSL certificates */
  validateStatus?: (status: number) => boolean;
  /** Retry configuration override */
  retry?: Partial<RetryConfig>;
  /** Disable retry for this request */
  disableRetry?: boolean;
}

/**
 * Response data
 */
export interface HttpResponse<T = unknown> {
  /** Response status code */
  status: number;
  /** Response status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  data: T;
  /** Response time in milliseconds */
  responseTime: number;
  /** Number of retry attempts made */
  retryAttempts?: number;
}

/**
 * Request error details
 */
export interface HttpError {
  /** Error message */
  message: string;
  /** HTTP status code (if response received) */
  status?: number;
  /** Response data (if any) */
  data?: unknown;
  /** Whether request timed out */
  isTimeout: boolean;
  /** Whether request was cancelled */
  isCancelled: boolean;
  /** Whether it's a network error */
  isNetworkError: boolean;
  /** Error code (e.g., ECONNREFUSED, ETIMEDOUT) */
  code?: string;
  /** Number of retry attempts made */
  retryAttempts?: number;
}

/**
 * Client configuration
 */
export interface AxiosClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: Partial<RetryConfig>;
}

/**
 * AxiosClient class
 * Provides HTTP client functionality with timing, retry, and error handling
 */
export class AxiosClient {
  private instance: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor(config?: AxiosClientConfig) {
    this.instance = axios.create({
      baseURL: config?.baseURL,
      timeout: config?.timeout ?? 30000,
      headers: config?.headers,
      validateStatus: () => true, // Don't throw on any status
    });
    
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config?.retry,
    };
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxRetryDelay);
  }

  /**
   * Check if the error/response is retryable
   */
  private isRetryable(error: HttpError | null, status: number | undefined, config: RetryConfig): boolean {
    // Check if status code is retryable
    if (status && config.retryableStatuses.includes(status)) {
      return true;
    }
    
    // Check network error
    if (error?.isNetworkError && config.retryOnNetworkError) {
      return true;
    }
    
    // Check timeout
    if (error?.isTimeout && config.retryOnTimeout) {
      return true;
    }
    
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make an HTTP request with retry support
   * @param config - Request configuration
   * @returns Response with timing data
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const startTime = Date.now();
    const effectiveRetryConfig: RetryConfig = {
      ...this.retryConfig,
      ...config.retry,
    };
    
    const maxAttempts = config.disableRetry ? 1 : effectiveRetryConfig.maxRetries + 1;
    let lastError: HttpError | null = null;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const axiosConfig: AxiosRequestConfig = {
          url: config.url,
          method: config.method,
          headers: config.headers,
          params: config.params,
          data: config.data,
          timeout: config.timeout ?? 30000,
          validateStatus: config.validateStatus ?? (() => true),
        };

        const response: AxiosResponse<T> = await this.instance.request(axiosConfig);
        const responseTime = Date.now() - startTime;

        // Check if response status is retryable
        if (attempt < maxAttempts - 1 && this.isRetryable(null, response.status, effectiveRetryConfig)) {
          const delay = this.calculateRetryDelay(attempt, effectiveRetryConfig);
          await this.sleep(delay);
          attempt++;
          continue;
        }

        return {
          status: response.status,
          statusText: response.statusText,
          headers: this.normalizeHeaders(response.headers),
          data: response.data,
          responseTime,
          retryAttempts: attempt,
        };
      } catch (error) {
        lastError = this.parseError(error);
        lastError.retryAttempts = attempt;
        
        // Check if we should retry
        if (attempt < maxAttempts - 1 && this.isRetryable(lastError, lastError.status, effectiveRetryConfig)) {
          const delay = this.calculateRetryDelay(attempt, effectiveRetryConfig);
          await this.sleep(delay);
          attempt++;
          continue;
        }
        
        // No more retries, throw the error
        const errorDetails = {
          url: config.url,
          method: config.method,
          status: lastError.status,
          isTimeout: lastError.isTimeout,
          isNetworkError: lastError.isNetworkError,
          retryAttempts: attempt,
          code: lastError.code,
        };
        const detailedError = error instanceof Error ? error : new Error(String(error));
        (detailedError as any).details = errorDetails;
        
        throw new ExternalServiceError(
          'AxiosClient',
          `HTTP request failed after ${attempt + 1} attempt(s): ${lastError.message}`,
          detailedError
        );
      }
    }

    // Should not reach here, but just in case
    throw new ExternalServiceError(
      'AxiosClient',
      `HTTP request failed after ${attempt} attempt(s): ${lastError?.message ?? 'Unknown error'}`,
      new Error(lastError?.message ?? 'Unknown error')
    );
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.entries(headers).forEach(([key, value]) => {
      this.instance.defaults.headers.common[key] = value;
    });
  }

  /**
   * Set authorization header
   */
  setAuthorization(value: string): void {
    this.instance.defaults.headers.common['Authorization'] = value;
  }

  /**
   * Clear authorization header
   */
  clearAuthorization(): void {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  /**
   * Normalize response headers to Record<string, string>
   */
  private normalizeHeaders(headers: AxiosResponse['headers']): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          normalized[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          normalized[key.toLowerCase()] = value.join(', ');
        }
      });
    }

    return normalized;
  }

  /**
   * Parse Axios error to HttpError
   */
  private parseError(error: unknown): HttpError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      return {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        isTimeout: axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT',
        isCancelled: axios.isCancel(error),
        isNetworkError: !axiosError.response,
        code: axiosError.code,
      };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      message,
      isTimeout: false,
      isCancelled: false,
      isNetworkError: false,
    };
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = {
      ...this.retryConfig,
      ...config,
    };
  }
}

/**
 * Creates an AxiosClient instance
 * @param config - Optional configuration
 * @returns AxiosClient instance
 */
export function createAxiosClient(config?: AxiosClientConfig): AxiosClient {
  return new AxiosClient(config);
}
