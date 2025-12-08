/**
 * executeOperation MCP Tool
 * Executes a single API operation
 */

import { McpToolDefinition } from '../../common/McpToolRegistry';
import { AxiosExecutionAdapter, ExecutionResult, ExecutionOverrides } from '../../../http/AxiosExecutionAdapter';
import { ISpecRepository, IEnvironmentRepository } from '../../../../domain/repositories';
import { HttpMethod } from '../../../../domain/models';

/**
 * Input for executeOperation tool
 */
export interface ExecuteOperationToolInput {
  /** Spec ID */
  specId: string;
  /** Environment name */
  envName: string;
  /** Operation ID to execute */
  operationId: string;
  /** Request overrides */
  overrides?: {
    /** Path parameter values */
    pathParams?: Record<string, string>;
    /** Query parameter values */
    query?: Record<string, string | number | boolean>;
    /** Additional headers */
    headers?: Record<string, string>;
    /** Request body */
    body?: unknown;
  };
}

/**
 * Output from executeOperation tool
 */
export interface ExecuteOperationToolOutput {
  success: boolean;
  operationId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: unknown;
    responseTime: number;
  };
  error?: string;
}

/**
 * Create the executeOperation MCP tool
 * @param specRepository - Spec repository
 * @param environmentRepository - Environment repository
 * @param executionAdapter - Axios execution adapter
 * @returns MCP tool definition
 */
export function createExecuteOperationTool(
  specRepository: ISpecRepository,
  environmentRepository: IEnvironmentRepository,
  executionAdapter: AxiosExecutionAdapter
): McpToolDefinition {
  return {
    name: 'swagger_execute_operation',
    description: 'Execute a single API operation. Provide the specId, environment name, and operationId. Optionally provide overrides for path params, query params, headers, and body.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: {
          type: 'string',
          description: 'The ID of the imported spec',
        },
        envName: {
          type: 'string',
          description: 'The environment name to execute against',
        },
        operationId: {
          type: 'string',
          description: 'The operation ID to execute',
        },
        overrides: {
          type: 'object',
          properties: {
            pathParams: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Path parameter values (e.g., {"petId": "123"})',
            },
            query: {
              type: 'object',
              additionalProperties: { 
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                ],
              },
              description: 'Query parameter values',
            },
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Additional headers to include',
            },
            body: {
              description: 'Request body (for POST, PUT, PATCH)',
            },
          },
        },
      },
      required: ['specId', 'envName', 'operationId'],
    },
    handler: async (input: unknown): Promise<ExecuteOperationToolOutput> => {
      const { specId, envName, operationId, overrides } = input as ExecuteOperationToolInput;

      // Get spec
      const spec = await specRepository.findById(specId);
      if (!spec) {
        throw new Error(`Spec not found: ${specId}`);
      }

      // Find operation
      const operation = spec.operations.find(op => op.operationId === operationId);
      if (!operation) {
        throw new Error(`Operation not found: ${operationId}`);
      }

      // Get environment
      const environments = await environmentRepository.findBySpecId(specId);
      const env = environments.find(e => e.name === envName);
      if (!env) {
        throw new Error(`Environment not found: ${envName} for spec ${specId}`);
      }

      // Build overrides
      const execOverrides: ExecutionOverrides = {
        pathParams: overrides?.pathParams,
        queryParams: overrides?.query,
        headers: overrides?.headers,
        body: overrides?.body,
      };

      // Execute operation
      const result = await executionAdapter.executeOperation(operation, env, execOverrides);

      return {
        success: result.success,
        operationId,
        request: {
          url: result.request.url,
          method: result.request.method,
          headers: result.request.headers,
          body: result.request.body,
        },
        response: {
          status: result.response.status,
          statusText: result.response.statusText,
          headers: result.response.headers as Record<string, string>,
          body: result.response.data,
          responseTime: result.response.responseTime,
        },
        error: result.error,
      };
    },
  };
}

/**
 * Tool name constant for registration
 */
export const EXECUTE_OPERATION_TOOL_NAME = 'swagger_execute_operation';
