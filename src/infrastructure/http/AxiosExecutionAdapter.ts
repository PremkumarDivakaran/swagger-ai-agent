/**
 * AxiosExecutionAdapter
 * Executes API operations using AxiosClient
 */

import { AxiosClient, HttpResponse, createAxiosClient } from './AxiosClient';
import {
  Operation,
  EnvironmentConfig,
  HttpMethod,
  getAuthorizationHeader,
  buildUrl,
} from '../../domain/models';

/**
 * Request overrides for execution
 */
export interface ExecutionOverrides {
  /** Path parameter values */
  pathParams?: Record<string, string>;
  /** Query parameter values */
  queryParams?: Record<string, string | number | boolean>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Whether execution was successful (2xx or expected status) */
  success: boolean;
  /** Request details */
  request: {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body?: unknown;
  };
  /** Response details */
  response: HttpResponse;
  /** Any error that occurred */
  error?: string;
}

/**
 * AxiosExecutionAdapter class
 * Handles execution of API operations
 */
export class AxiosExecutionAdapter {
  private client: AxiosClient;

  constructor(client?: AxiosClient) {
    this.client = client ?? createAxiosClient();
  }

  /**
   * Execute a single operation
   * @param operation - Operation to execute
   * @param env - Environment configuration
   * @param overrides - Request overrides
   * @returns Execution result
   */
  async executeOperation(
    operation: Operation,
    env: EnvironmentConfig,
    overrides?: ExecutionOverrides
  ): Promise<ExecutionResult> {
    // Build URL with path parameters
    let path = operation.path;
    const pathParams = overrides?.pathParams ?? {};
    
    // Replace path parameters
    for (const param of operation.parameters.filter(p => p.in === 'path')) {
      const value = pathParams[param.name];
      if (value !== undefined) {
        path = path.replace(`{${param.name}}`, encodeURIComponent(value));
      }
    }

    const url = buildUrl(env, path);

    // Build headers
    const headers: Record<string, string> = {
      ...env.defaultHeaders,
      ...this.getContentTypeHeader(operation),
      ...overrides?.headers,
    };

    // Add authorization header if configured
    const authHeader = getAuthorizationHeader(env);
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Build query parameters
    const queryParams: Record<string, string | number | boolean> = {};
    for (const param of operation.parameters.filter(p => p.in === 'query')) {
      const value = overrides?.queryParams?.[param.name];
      if (value !== undefined) {
        queryParams[param.name] = value;
      }
    }

    // Add header parameters
    for (const param of operation.parameters.filter(p => p.in === 'header')) {
      const value = overrides?.headers?.[param.name];
      if (value !== undefined) {
        headers[param.name] = value;
      }
    }

    // Determine request body
    const body = overrides?.body;

    try {
      const response = await this.client.request({
        url,
        method: operation.method,
        headers,
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        data: body,
        timeout: env.timeout,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        request: {
          url,
          method: operation.method,
          headers,
          body,
        },
        response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        request: {
          url,
          method: operation.method,
          headers,
          body,
        },
        response: {
          status: 0,
          statusText: 'Error',
          headers: {},
          data: null,
          responseTime: 0,
        },
        error: errorMessage,
      };
    }
  }

  /**
   * Execute multiple operations sequentially
   * @param operations - Operations to execute
   * @param env - Environment configuration
   * @param overridesMap - Map of operation ID to overrides
   * @returns Map of operation ID to execution result
   */
  async executeOperations(
    operations: Operation[],
    env: EnvironmentConfig,
    overridesMap?: Map<string, ExecutionOverrides>
  ): Promise<Map<string, ExecutionResult>> {
    const results = new Map<string, ExecutionResult>();

    for (const operation of operations) {
      const overrides = overridesMap?.get(operation.operationId);
      const result = await this.executeOperation(operation, env, overrides);
      results.set(operation.operationId, result);
    }

    return results;
  }

  /**
   * Get content type header based on operation
   */
  private getContentTypeHeader(operation: Operation): Record<string, string> {
    if (operation.requestBody?.content) {
      const contentTypes = Object.keys(operation.requestBody.content);
      if (contentTypes.includes('application/json')) {
        return { 'Content-Type': 'application/json' };
      }
      if (contentTypes.length > 0) {
        return { 'Content-Type': contentTypes[0] };
      }
    }
    return {};
  }
}

/**
 * Creates an AxiosExecutionAdapter instance
 * @param client - Optional AxiosClient instance
 * @returns AxiosExecutionAdapter instance
 */
export function createAxiosExecutionAdapter(client?: AxiosClient): AxiosExecutionAdapter {
  return new AxiosExecutionAdapter(client);
}
