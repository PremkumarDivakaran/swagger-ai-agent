/**
 * Unit tests for DeleteSpecUseCase
 */

import { DeleteSpecUseCase, DeleteSpecInput } from '../../../../src/application/spec';
import { ISpecRepository, IEnvironmentRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec, EnvironmentConfig } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

// Mock repositories
const mockSpecRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockEnvironmentRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findBySpecId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DeleteSpecUseCase', () => {
  let useCase: DeleteSpecUseCase;
  let mockSpec: NormalizedSpec;
  let mockEnvironments: EnvironmentConfig[];

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
      servers: [{ url: 'https://api.example.com' }],
      operations: [],
      securitySchemes: [],
      tags: [],
      globalSecurity: [],
      metadata: {
        importedAt: new Date(),
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
        fileHash: 'abc123',
      },
    };

    mockEnvironments = [
      {
        id: 'env-1',
        name: 'Production',
        specId: 'spec-123',
        baseUrl: 'https://api.example.com',
        variables: {},
        authConfig: { type: 'none' },
        defaultHeaders: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'env-2',
        name: 'Staging',
        specId: 'spec-123',
        baseUrl: 'https://staging.example.com',
        variables: {},
        authConfig: { type: 'none' },
        defaultHeaders: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    useCase = new DeleteSpecUseCase(
      mockSpecRepository as unknown as ISpecRepository,
      mockEnvironmentRepository as unknown as IEnvironmentRepository
    );
  });

  describe('execute', () => {
    it('should delete spec without environments', async () => {
      const input: DeleteSpecInput = {
        specId: 'spec-123',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);
      mockSpecRepository.delete.mockResolvedValue(true);

      const result = await useCase.execute(input);

      expect(mockSpecRepository.findById).toHaveBeenCalledWith('spec-123');
      expect(mockSpecRepository.delete).toHaveBeenCalledWith('spec-123');
      expect(result.success).toBe(true);
      expect(result.specId).toBe('spec-123');
      expect(result.environmentsDeleted).toBe(0);
    });

    it('should throw NotFoundError for non-existent spec', async () => {
      const input: DeleteSpecInput = {
        specId: 'non-existent',
      };

      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw error when environments exist and force is false', async () => {
      const input: DeleteSpecInput = {
        specId: 'spec-123',
        force: false,
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue(mockEnvironments);

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should delete spec and environments when force is true', async () => {
      const input: DeleteSpecInput = {
        specId: 'spec-123',
        force: true,
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue(mockEnvironments);
      mockEnvironmentRepository.delete.mockResolvedValue(true);
      mockSpecRepository.delete.mockResolvedValue(true);

      const result = await useCase.execute(input);

      expect(mockEnvironmentRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockEnvironmentRepository.delete).toHaveBeenCalledWith('env-1');
      expect(mockEnvironmentRepository.delete).toHaveBeenCalledWith('env-2');
      expect(mockSpecRepository.delete).toHaveBeenCalledWith('spec-123');
      expect(result.success).toBe(true);
      expect(result.environmentsDeleted).toBe(2);
    });

    it('should default force to false when not specified', async () => {
      const input: DeleteSpecInput = {
        specId: 'spec-123',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue(mockEnvironments);

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should return correct result structure', async () => {
      const input: DeleteSpecInput = {
        specId: 'spec-123',
        force: true,
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);
      mockSpecRepository.delete.mockResolvedValue(true);

      const result = await useCase.execute(input);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('specId');
      expect(result).toHaveProperty('environmentsDeleted');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.specId).toBe('string');
      expect(typeof result.environmentsDeleted).toBe('number');
    });
  });
});
