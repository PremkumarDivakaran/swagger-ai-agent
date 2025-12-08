/**
 * Unit tests for listOperations MCP tool
 */

import { 
  createListOperationsTool, 
  ListOperationsToolInput,
  ListOperationsToolOutput,
  LIST_OPERATIONS_TOOL_NAME,
} from '../../../../../../src/infrastructure/mcp/swagger/tools/listOperations.tool';
import { ListOperationsUseCase, ListOperationsOutput } from '../../../../../../src/application/spec';
import { ISpecRepository } from '../../../../../../src/domain/repositories';

// Mock the ListOperationsUseCase
jest.mock('../../../../../../src/application/spec', () => {
  return {
    ListOperationsUseCase: jest.fn().mockImplementation(() => ({
      execute: jest.fn(),
    })),
  };
});

describe('createListOperationsTool', () => {
  let mockSpecRepository: jest.Mocked<Partial<ISpecRepository>>;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Only mock the methods we need for testing
    // The actual repository is not used since ListOperationsUseCase is mocked
    mockSpecRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    // Get reference to the mocked execute function
    mockExecute = jest.fn();
    (ListOperationsUseCase as jest.Mock).mockImplementation(() => ({
      execute: mockExecute,
    }));
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      expect(tool.name).toBe('swagger_list_operations');
    });

    it('should have correct description', () => {
      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      expect(tool.description).toContain('List all operations');
      expect(tool.description).toContain('OpenAPI/Swagger');
    });

    it('should have correct input schema', () => {
      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          specId: {
            type: 'string',
            description: expect.any(String),
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: expect.any(String),
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            description: expect.any(String),
          },
        },
        required: ['specId'],
      });
    });

    it('should export tool name constant', () => {
      expect(LIST_OPERATIONS_TOOL_NAME).toBe('swagger_list_operations');
    });
  });

  describe('handler', () => {
    it('should list all operations without filters', async () => {
      const useCaseResult: ListOperationsOutput = {
        specId: 'spec-123',
        totalCount: 3,
        filteredCount: 3,
        operations: [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            summary: 'Get all users',
            deprecated: false,
            requiresAuth: true,
          },
          {
            operationId: 'createUser',
            method: 'post',
            path: '/users',
            tags: ['users'],
            summary: 'Create a user',
            deprecated: false,
            requiresAuth: true,
          },
          {
            operationId: 'getProducts',
            method: 'get',
            path: '/products',
            tags: ['products'],
            summary: 'Get all products',
            deprecated: false,
            requiresAuth: false,
          },
        ],
      };

      mockExecute.mockResolvedValue(useCaseResult);

      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      const input: ListOperationsToolInput = { specId: 'spec-123' };
      
      const result = await tool.handler(input) as ListOperationsToolOutput;

      expect(result.specId).toBe('spec-123');
      expect(result.totalOperations).toBe(3);
      expect(result.filteredOperations).toBe(3);
      expect(result.operations).toHaveLength(3);
      expect(result.operations[0]).toEqual({
        operationId: 'getUsers',
        method: 'GET',
        path: '/users',
        tags: ['users'],
        summary: 'Get all users',
        requiresAuth: true,
        deprecated: false,
      });
    });

    it('should filter by single tag', async () => {
      const useCaseResult: ListOperationsOutput = {
        specId: 'spec-123',
        totalCount: 3,
        filteredCount: 2,
        operations: [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            deprecated: false,
            requiresAuth: true,
          },
          {
            operationId: 'createUser',
            method: 'post',
            path: '/users',
            tags: ['users'],
            deprecated: false,
            requiresAuth: true,
          },
        ],
      };

      mockExecute.mockResolvedValue(useCaseResult);

      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      const input: ListOperationsToolInput = { 
        specId: 'spec-123',
        tags: ['users'],
      };
      
      const result = await tool.handler(input) as ListOperationsToolOutput;

      expect(mockExecute).toHaveBeenCalledWith({
        specId: 'spec-123',
        filter: {
          tag: 'users',
          method: undefined,
        },
      });
      expect(result.filteredOperations).toBe(2);
    });

    it('should filter by method', async () => {
      const useCaseResult: ListOperationsOutput = {
        specId: 'spec-123',
        totalCount: 3,
        filteredCount: 2,
        operations: [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            deprecated: false,
            requiresAuth: true,
          },
          {
            operationId: 'getProducts',
            method: 'get',
            path: '/products',
            tags: ['products'],
            deprecated: false,
            requiresAuth: false,
          },
        ],
      };

      mockExecute.mockResolvedValue(useCaseResult);

      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      const input: ListOperationsToolInput = { 
        specId: 'spec-123',
        method: 'GET',
      };
      
      const result = await tool.handler(input) as ListOperationsToolOutput;

      expect(mockExecute).toHaveBeenCalledWith({
        specId: 'spec-123',
        filter: {
          tag: undefined,
          method: 'GET',
        },
      });
      expect(result.filteredOperations).toBe(2);
    });

    it('should filter by multiple tags (additional filtering)', async () => {
      const useCaseResult: ListOperationsOutput = {
        specId: 'spec-123',
        totalCount: 4,
        filteredCount: 3,
        operations: [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users', 'public'],
            deprecated: false,
            requiresAuth: false,
          },
          {
            operationId: 'createUser',
            method: 'post',
            path: '/users',
            tags: ['users', 'admin'],
            deprecated: false,
            requiresAuth: true,
          },
          {
            operationId: 'deleteUser',
            method: 'delete',
            path: '/users/{id}',
            tags: ['users', 'admin'],
            deprecated: false,
            requiresAuth: true,
          },
        ],
      };

      mockExecute.mockResolvedValue(useCaseResult);

      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      const input: ListOperationsToolInput = { 
        specId: 'spec-123',
        tags: ['users', 'admin'],
      };
      
      const result = await tool.handler(input) as ListOperationsToolOutput;

      // With multiple tags, we do additional filtering
      expect(result.filteredOperations).toBe(3);
    });

    it('should handle errors from use case', async () => {
      mockExecute.mockRejectedValue(new Error('Spec not found'));

      const tool = createListOperationsTool(mockSpecRepository as unknown as ISpecRepository);
      const input: ListOperationsToolInput = { specId: 'invalid-spec' };
      
      await expect(tool.handler(input)).rejects.toThrow('Spec not found');
    });
  });
});
