/**
 * AxiosClient
 * Wrapper around Axios for making HTTP requests
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ExternalServiceError } from '../../core/errors';
import { HttpMethod } from '../../domain/models';

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
}

/**
 * AxiosClient class
 * Provides HTTP client functionality with timing and error handling
 */
export class AxiosClient {
  private instance: AxiosInstance;

  constructor(config?: {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) {
    this.instance = axios.create({
      baseURL: config?.baseURL,
      timeout: config?.timeout ?? 30000,
      headers: config?.headers,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  /**
   * Make an HTTP request
   * @param config - Request configuration
   * @returns Response with timing data
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const startTime = Date.now();

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

      return {
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
        data: response.data,
        responseTime,
      };
    } catch (error) {
      const httpError = this.parseError(error);
      throw new ExternalServiceError(
        'AxiosClient',
        `HTTP request failed: ${httpError.message}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
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
}

/**
 * Creates an AxiosClient instance
 * @param config - Optional configuration
 * @returns AxiosClient instance
 */
export function createAxiosClient(config?: {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}): AxiosClient {
  return new AxiosClient(config);
}
