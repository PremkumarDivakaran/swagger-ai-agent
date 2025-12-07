/**
 * Unit tests for ListOperationsUseCase
 */

import { ListOperationsUseCase, ListOperationsInput } from '../../../../src/application/spec';
import { ISpecRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec, Operation } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

// Mock spec repository
const mockSpecRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ListOperationsUseCase', () => {
  let useCase: ListOperationsUseCase;
  let mockSpec: NormalizedSpec;
  let mockOperations: Operation[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockOperations = [
      {
        operationId: 'getUsers',
        method: 'GET',
        path: '/users',
        tags: ['users'],
        summary: 'Get all users',
        description: 'Returns a list of users',
        parameters: [],
        requestBody: undefined,
        responses: [],
        security: [{ schemeName: 'bearerAuth', scopes: [] }],
        deprecated: false,
      },
      {
        operationId: 'createUser',
        method: 'POST',
        path: '/users',
        tags: ['users'],
        summary: 'Create a user',
        description: 'Creates a new user',
        parameters: [],
        requestBody: undefined,
        responses: [],
        security: [{ schemeName: 'bearerAuth', scopes: [] }],
        deprecated: false,
      },
      {
        operationId: 'getOrders',
        method: 'GET',
        path: '/orders',
        tags: ['orders'],
        summary: 'Get all orders',
        description: 'Returns a list of orders',
        parameters: [],
        requestBody: undefined,
        responses: [],
        security: [],
        deprecated: false,
      },
      {
        operationId: 'legacyEndpoint',
        method: 'GET',
        path: '/legacy',
        tags: ['deprecated'],
        summary: 'Legacy endpoint',
        description: 'This is deprecated',
        parameters: [],
        requestBody: undefined,
        responses: [],
        security: [],
        deprecated: true,
      },
    ];

    mockSpec = {
      id: 'spec-123',
      openApiVersion: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API description',
      },
      servers: [{ url: 'https://api.example.com' }],
      operations: mockOperations,
      securitySchemes: [],
      tags: [
        { name: 'users', description: 'User operations' },
        { name: 'orders', description: 'Order operations' },
        { name: 'deprecated', description: 'Deprecated operations' },
      ],
      globalSecurity: [],
      metadata: {
        importedAt: new Date(),
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
        fileHash: 'abc123',
      },
    };

    useCase = new ListOperationsUseCase(
      mockSpecRepository as unknown as ISpecRepository
    );
  });

  describe('execute', () => {
    it('should list all operations without filters', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.specId).toBe('spec-123');
      expect(result.totalCount).toBe(4);
      expect(result.filteredCount).toBe(4);
      expect(result.operations).toHaveLength(4);
    });

    it('should throw NotFoundError for non-existent spec', async () => {
      const input: ListOperationsInput = {
        specId: 'non-existent',
      };

      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should filter operations by tag', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          tag: 'users',
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(2);
      expect(result.operations.every(op => op.tags.includes('users'))).toBe(true);
    });

    it('should filter operations by HTTP method', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          method: 'GET',
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(3);
      expect(result.operations.every(op => op.method === 'GET')).toBe(true);
    });

    it('should filter operations by path pattern', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          pathPattern: '/users',
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(2);
      expect(result.operations.every(op => op.path.includes('/users'))).toBe(true);
    });

    it('should exclude deprecated operations when includeDeprecated is false', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          includeDeprecated: false,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(3);
      expect(result.operations.every(op => !op.deprecated)).toBe(true);
    });

    it('should filter operations requiring auth', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          requiresAuth: true,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(2);
      expect(result.operations.every(op => op.requiresAuth)).toBe(true);
    });

    it('should filter operations not requiring auth', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          requiresAuth: false,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(2);
      expect(result.operations.every(op => !op.requiresAuth)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
        filter: {
          tag: 'users',
          method: 'GET',
          requiresAuth: true,
        },
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(result.filteredCount).toBe(1);
      expect(result.operations[0].operationId).toBe('getUsers');
    });

    it('should return operation summaries with correct fields', async () => {
      const input: ListOperationsInput = {
        specId: 'spec-123',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      const operation = result.operations[0];
      expect(operation).toHaveProperty('operationId');
      expect(operation).toHaveProperty('method');
      expect(operation).toHaveProperty('path');
      expect(operation).toHaveProperty('tags');
      expect(operation).toHaveProperty('summary');
      expect(operation).toHaveProperty('deprecated');
      expect(operation).toHaveProperty('requiresAuth');
    });
  });
});
