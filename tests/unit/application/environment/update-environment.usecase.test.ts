/**
 * UpdateEnvironmentUseCase tests
 */

import { UpdateEnvironmentUseCase, UpdateEnvironmentInput } from '../../../../src/application/environment';
import { IEnvironmentRepository } from '../../../../src/domain/repositories';
import { EnvironmentConfig } from '../../../../src/domain/models';
import { NotFoundError, ValidationError } from '../../../../src/core/errors';

describe('UpdateEnvironmentUseCase', () => {
  let useCase: UpdateEnvironmentUseCase;
  let mockEnvironmentRepository: jest.Mocked<IEnvironmentRepository>;

  const mockEnvironment: EnvironmentConfig = {
    id: 'env-123',
    specId: 'spec-123',
    name: 'dev',
    baseUrl: 'https://dev.api.example.com',
    defaultHeaders: { 'X-Api-Version': '1' },
    authConfig: { type: 'none' },
    timeout: 30000,
    verifySsl: true,
    variables: { apiKey: 'test-key' },
    isDefault: false,
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

    useCase = new UpdateEnvironmentUseCase(mockEnvironmentRepository);
  });

  describe('execute', () => {
    it('should update environment successfully', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockImplementation(async (env) => env);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnvironment]);

      const input: UpdateEnvironmentInput = {
        envId: 'env-123',
        baseUrl: 'https://new-dev.api.example.com',
        description: 'Updated description',
      };

      const result = await useCase.execute(input);

      expect(result.envId).toBe('env-123');
      expect(result.baseUrl).toBe('https://new-dev.api.example.com');
      expect(mockEnvironmentRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError if environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      const input: UpdateEnvironmentInput = {
        envId: 'non-existent',
        baseUrl: 'https://new.api.example.com',
      };

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid base URL', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);

      const input: UpdateEnvironmentInput = {
        envId: 'env-123',
        baseUrl: 'not-a-valid-url',
      };

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should update auth configuration', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockImplementation(async (env) => env);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnvironment]);

      const input: UpdateEnvironmentInput = {
        envId: 'env-123',
        authConfig: { type: 'bearer', token: 'new-token' },
      };

      const result = await useCase.execute(input);

      expect(result.envId).toBe('env-123');
      expect(mockEnvironmentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          authConfig: { type: 'bearer', token: 'new-token' },
        })
      );
    });

    it('should set as default and clear other defaults', async () => {
      const otherEnv: EnvironmentConfig = {
        ...mockEnvironment,
        id: 'env-456',
        name: 'prod',
        isDefault: true,
      };

      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockImplementation(async (env) => env);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnvironment, otherEnv]);

      const input: UpdateEnvironmentInput = {
        envId: 'env-123',
        isDefault: true,
      };

      await useCase.execute(input);

      // Should have called update twice: once for the main env, once to clear other default
      expect(mockEnvironmentRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should update timeout and verifySsl', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.update.mockImplementation(async (env) => env);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([mockEnvironment]);

      const input: UpdateEnvironmentInput = {
        envId: 'env-123',
        timeout: 60000,
        verifySsl: false,
      };

      await useCase.execute(input);

      expect(mockEnvironmentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
          verifySsl: false,
        })
      );
    });
  });
});
