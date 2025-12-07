/**
 * AxiosHttpClientAdapter
 * Adapts AxiosClient to the HttpClient interface used by ExecuteRunUseCase
 */

import { AxiosClient, createAxiosClient, HttpRequestConfig } from './AxiosClient';
import { HttpMethod } from '../../domain/models';

/**
 * HttpClient interface from the application layer
 * Re-exported here for convenience
 */
export interface HttpClient {
  request(options: HttpRequestOptions): Promise<HttpResponse>;
}

export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
}

export interface HttpResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
}

/**
 * AxiosHttpClientAdapter class
 * Adapts AxiosClient to HttpClient interface for use in ExecuteRunUseCase
 */
export class AxiosHttpClientAdapter implements HttpClient {
  private client: AxiosClient;

  constructor(config?: {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) {
    this.client = createAxiosClient(config);
  }

  /**
   * Make an HTTP request
   * @param options - Request options
   * @returns Response with status, headers, body, and timing
   */
  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    const config: HttpRequestConfig = {
      url: options.url,
      method: options.method.toUpperCase() as HttpMethod,
      headers: options.headers,
      params: options.params,
      data: options.body,
      timeout: options.timeout ?? 30000,
    };

    try {
      const response = await this.client.request(config);

      return {
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        responseTime: response.responseTime,
      };
    } catch (error) {
      // Re-throw errors from AxiosClient (ExternalServiceError)
      // The use case will catch and handle appropriately
      throw error;
    }
  }
}

/**
 * Creates an AxiosHttpClientAdapter instance
 * @param config - Optional configuration
 * @returns AxiosHttpClientAdapter instance
 */
export function createAxiosHttpClient(config?: {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}): HttpClient {
  return new AxiosHttpClientAdapter(config);
}
