/**
 * Unit tests for GetSpecUseCase
 */

import { GetSpecUseCase } from '../../../../src/application/spec';
import { ISpecRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

// Mock spec repository
const mockSpecRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('GetSpecUseCase', () => {
  let useCase: GetSpecUseCase;
  let mockSpec: NormalizedSpec;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpec = {
      id: 'spec-123',
      openApiVersion: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API description',
      },
      servers: [
        { url: 'https://api.example.com', description: 'Production' },
        { url: 'https://staging.example.com', description: 'Staging' },
      ],
      operations: [
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
          security: [],
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
          security: [],
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
      ],
      securitySchemes: [
        {
          name: 'bearerAuth',
          type: 'http',
          scheme: 'bearer',
          description: 'JWT Bearer token',
        },
        {
          name: 'apiKey',
          type: 'apiKey',
          in: 'header',
          description: 'API Key authentication',
        },
      ],
      tags: [
        { name: 'users', description: 'User operations' },
        { name: 'orders', description: 'Order operations' },
      ],
      globalSecurity: [],
      metadata: {
        importedAt: new Date('2024-01-01T00:00:00Z'),
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
        fileHash: 'abc123',
      },
    };

    useCase = new GetSpecUseCase(
      mockSpecRepository as unknown as ISpecRepository
    );
  });

  describe('execute', () => {
    it('should return spec metadata by ID', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(mockSpecRepository.findById).toHaveBeenCalledWith('spec-123');
      expect(result.id).toBe('spec-123');
      expect(result.title).toBe('Test API');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('Test API description');
    });

    it('should throw NotFoundError for non-existent spec', async () => {
      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should include server information', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(result.servers).toHaveLength(2);
      expect(result.servers[0].url).toBe('https://api.example.com');
      expect(result.servers[0].description).toBe('Production');
    });

    it('should include tag information with operation counts', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(result.tags).toHaveLength(2);
      const usersTag = result.tags.find(t => t.name === 'users');
      expect(usersTag).toBeDefined();
      expect(usersTag?.operationCount).toBe(2);
    });

    it('should include total operation count', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(result.operationCount).toBe(3);
    });

    it('should include source information', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(result.source).toBeDefined();
      expect(result.source.type).toBeDefined();
      expect(result.source.location).toBe('https://example.com/api.yaml');
      expect(result.source.importedAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('should include security schemes', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute('spec-123');

      expect(result.securitySchemes).toHaveLength(2);
      expect(result.securitySchemes[0].name).toBe('bearerAuth');
      expect(result.securitySchemes[0].type).toBe('http');
    });
  });

  describe('getTagStats', () => {
    it('should return tag statistics', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.getTagStats('spec-123');

      expect(result.specId).toBe('spec-123');
      expect(result.tags).toHaveLength(2);
      expect(result.totalTags).toBe(2);
    });

    it('should throw NotFoundError for non-existent spec', async () => {
      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.getTagStats('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should include operation counts per tag', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.getTagStats('spec-123');

      const usersTag = result.tags.find(t => t.name === 'users');
      const ordersTag = result.tags.find(t => t.name === 'orders');

      expect(usersTag?.operationCount).toBe(2);
      expect(ordersTag?.operationCount).toBe(1);
    });
  });

  describe('listAll', () => {
    it('should list all specs', async () => {
      const specs = [
        mockSpec,
        {
          ...mockSpec,
          id: 'spec-456',
          info: { title: 'Another API', version: '2.0.0' },
        },
      ];

      mockSpecRepository.find.mockResolvedValue({
        items: specs,
        total: 2,
      });

      const result = await useCase.listAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('spec-123');
      expect(result[1].id).toBe('spec-456');
    });

    it('should return empty array when no specs exist', async () => {
      mockSpecRepository.find.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await useCase.listAll();

      expect(result).toHaveLength(0);
    });

    it('should include spec summaries with correct fields', async () => {
      mockSpecRepository.find.mockResolvedValue({
        items: [mockSpec],
        total: 1,
      });

      const result = await useCase.listAll();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('version');
      expect(result[0]).toHaveProperty('operationCount');
      expect(result[0]).toHaveProperty('importedAt');
    });
  });
});
