/**
 * GetEnvironmentUseCase tests
 */

import { GetEnvironmentUseCase } from '../../../../src/application/environment';
import { IEnvironmentRepository, ISpecRepository } from '../../../../src/domain/repositories';
import { EnvironmentConfig, NormalizedSpec } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

describe('GetEnvironmentUseCase', () => {
  let useCase: GetEnvironmentUseCase;
  let mockEnvironmentRepository: jest.Mocked<IEnvironmentRepository>;
  let mockSpecRepository: jest.Mocked<ISpecRepository>;

  const mockSpec: NormalizedSpec = {
    id: 'spec-123',
    openApiVersion: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'Test API Description',
    },
    servers: [{ url: 'https://api.example.com', description: 'Production' }],
    tags: [{ name: 'pets', description: 'Pet operations' }],
    operations: [],
    globalSecurity: [],
    securitySchemes: [],
    metadata: {
      sourceType: 'url',
      sourceLocation: 'https://api.example.com/spec.json',
      importedAt: new Date(),
      fileHash: 'abc123',
    },
  };

  const mockEnvironment: EnvironmentConfig = {
    id: 'env-123',
    specId: 'spec-123',
    name: 'dev',
    baseUrl: 'https://dev.api.example.com',
    defaultHeaders: { 'X-Api-Version': '1' },
    authConfig: { type: 'bearer', token: 'secret-token' },
    timeout: 30000,
    verifySsl: true,
    variables: { apiKey: 'test-key' },
    isDefault: true,
    description: 'Development environment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockEnvironmentRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findBySpecId: jest.fn(),
      findBySpecIdAndName: jest.fn(),
      findDefaultBySpecId: jest.fn(),
      setAsDefault: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      deleteBySpecId: jest.fn(),
    };

    mockSpecRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findBySourceLocation: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      existsBySource: jest.fn(),
    };

    useCase = new GetEnvironmentUseCase(mockEnvironmentRepository, mockSpecRepository);
  });

  describe('getById', () => {
    it('should return environment details by ID', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);

      const result = await useCase.getById({ envId: 'env-123' });

      expect(result.id).toBe('env-123');
      expect(result.specId).toBe('spec-123');
      expect(result.name).toBe('dev');
      expect(result.baseUrl).toBe('https://dev.api.example.com');
      expect(result.authType).toBe('bearer');
      expect(result.hasAuth).toBe(true);
      expect(result.isDefault).toBe(true);
      expect(result.variableNames).toContain('apiKey');
    });

    it('should throw NotFoundError if environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      await expect(useCase.getById({ envId: 'non-existent' })).rejects.toThrow(NotFoundError);
    });

    it('should not expose auth credentials', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);

      const result = await useCase.getById({ envId: 'env-123' });

      // Should only have auth type, not the actual token
      expect(result.authType).toBe('bearer');
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('authConfig');
    });
  });

  describe('listBySpec', () => {
    it('should return list of environments for a spec', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([
        mockEnvironment,
        { ...mockEnvironment, id: 'env-456', name: 'prod', isDefault: false },
      ]);

      const result = await useCase.listBySpec({ specId: 'spec-123' });

      expect(result.specId).toBe('spec-123');
      expect(result.environments).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw NotFoundError if spec does not exist', async () => {
      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.listBySpec({ specId: 'non-existent' })).rejects.toThrow(NotFoundError);
    });

    it('should return empty list if no environments exist', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);

      const result = await useCase.listBySpec({ specId: 'spec-123' });

      expect(result.environments).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getDefault', () => {
    it('should return default environment for a spec', async () => {
      mockEnvironmentRepository.findDefaultBySpecId.mockResolvedValue(mockEnvironment);

      const result = await useCase.getDefault('spec-123');

      expect(result).not.toBeNull();
      expect(result?.isDefault).toBe(true);
    });

    it('should return null if no default environment exists', async () => {
      mockEnvironmentRepository.findDefaultBySpecId.mockResolvedValue(null);

      const result = await useCase.getDefault('spec-123');

      expect(result).toBeNull();
    });
  });
});
