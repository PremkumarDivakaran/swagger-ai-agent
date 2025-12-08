/**
 * listOperations MCP Tool
 * Lists operations from an imported OpenAPI spec
 */

import { McpToolDefinition } from '../../common/McpToolRegistry';
import { ListOperationsUseCase, ListOperationsOutput } from '../../../../application/spec';
import { ISpecRepository } from '../../../../domain/repositories';

/**
 * Input for listOperations tool
 */
export interface ListOperationsToolInput {
  /** Spec ID to list operations from */
  specId: string;
  /** Optional filter by tags */
  tags?: string[];
  /** Optional filter by HTTP method */
  method?: string;
}

/**
 * Output from listOperations tool
 */
export interface ListOperationsToolOutput {
  specId: string;
  totalOperations: number;
  filteredOperations: number;
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    summary?: string;
    tags: string[];
    requiresAuth: boolean;
    deprecated: boolean;
  }>;
}

/**
 * Create the listOperations MCP tool
 * @param specRepository - Spec repository instance
 * @returns MCP tool definition
 */
export function createListOperationsTool(
  specRepository: ISpecRepository
): McpToolDefinition {
  const useCase = new ListOperationsUseCase(specRepository);

  return {
    name: 'swagger_list_operations',
    description: 'List all operations from an imported OpenAPI/Swagger specification. Returns operation IDs, methods, paths, summaries, and tags.',
    inputSchema: {
      type: 'object',
      properties: {
        specId: {
          type: 'string',
          description: 'The ID of the imported spec to list operations from',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter to only return operations with specific tags',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          description: 'Optional filter to only return operations with a specific HTTP method',
        },
      },
      required: ['specId'],
    },
    handler: async (input: unknown): Promise<ListOperationsToolOutput> => {
      const { specId, tags, method } = input as ListOperationsToolInput;

      // Use the ListOperationsUseCase with filter
      const result = await useCase.execute({
        specId,
        filter: {
          tag: tags?.[0], // Use first tag for filter
          method: method,
        },
      });

      // Apply additional tag filtering if multiple tags provided
      let operations = result.operations;
      if (tags && tags.length > 1) {
        operations = operations.filter(op => 
          op.tags.some(tag => tags.includes(tag))
        );
      }

      return {
        specId: result.specId,
        totalOperations: result.totalCount,
        filteredOperations: operations.length,
        operations: operations.map(op => ({
          operationId: op.operationId,
          method: op.method.toUpperCase(),
          path: op.path,
          summary: op.summary,
          tags: op.tags,
          requiresAuth: op.requiresAuth,
          deprecated: op.deprecated,
        })),
      };
    },
  };
}

/**
 * Tool name constant for registration
 */
export const LIST_OPERATIONS_TOOL_NAME = 'swagger_list_operations';
