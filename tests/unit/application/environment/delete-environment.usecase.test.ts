/**
 * DeleteEnvironmentUseCase tests
 */

import { DeleteEnvironmentUseCase, DeleteEnvironmentInput } from '../../../../src/application/environment';
import { IEnvironmentRepository } from '../../../../src/domain/repositories';
import { EnvironmentConfig } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

describe('DeleteEnvironmentUseCase', () => {
  let useCase: DeleteEnvironmentUseCase;
  let mockEnvironmentRepository: jest.Mocked<IEnvironmentRepository>;

  const mockEnvironment: EnvironmentConfig = {
    id: 'env-123',
    specId: 'spec-123',
    name: 'dev',
    baseUrl: 'https://dev.api.example.com',
    defaultHeaders: {},
    authConfig: { type: 'none' },
    variables: {},
    isDefault: false,
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

    useCase = new DeleteEnvironmentUseCase(mockEnvironmentRepository);
  });

  describe('execute', () => {
    it('should delete environment successfully', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.delete.mockResolvedValue(true);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);

      const input: DeleteEnvironmentInput = { envId: 'env-123' };

      const result = await useCase.execute(input);

      expect(result.envId).toBe('env-123');
      expect(result.message).toContain('deleted successfully');
      expect(mockEnvironmentRepository.delete).toHaveBeenCalledWith('env-123');
    });

    it('should throw NotFoundError if environment does not exist', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(null);

      const input: DeleteEnvironmentInput = { envId: 'non-existent' };

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should set another environment as default when deleting the default', async () => {
      const defaultEnv: EnvironmentConfig = {
        ...mockEnvironment,
        isDefault: true,
      };
      const otherEnv: EnvironmentConfig = {
        ...mockEnvironment,
        id: 'env-456',
        name: 'prod',
        isDefault: false,
      };

      mockEnvironmentRepository.findById.mockResolvedValue(defaultEnv);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([defaultEnv, otherEnv]);
      mockEnvironmentRepository.setAsDefault.mockResolvedValue({ ...otherEnv, isDefault: true });
      mockEnvironmentRepository.delete.mockResolvedValue(true);

      const input: DeleteEnvironmentInput = { envId: 'env-123' };

      await useCase.execute(input);

      expect(mockEnvironmentRepository.setAsDefault).toHaveBeenCalledWith('env-456');
    });

    it('should not set default if no other environments exist', async () => {
      const defaultEnv: EnvironmentConfig = {
        ...mockEnvironment,
        isDefault: true,
      };

      mockEnvironmentRepository.findById.mockResolvedValue(defaultEnv);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([defaultEnv]);
      mockEnvironmentRepository.delete.mockResolvedValue(true);

      const input: DeleteEnvironmentInput = { envId: 'env-123' };

      await useCase.execute(input);

      expect(mockEnvironmentRepository.setAsDefault).not.toHaveBeenCalled();
    });

    it('should include environment name in success message', async () => {
      mockEnvironmentRepository.findById.mockResolvedValue(mockEnvironment);
      mockEnvironmentRepository.delete.mockResolvedValue(true);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);

      const input: DeleteEnvironmentInput = { envId: 'env-123' };

      const result = await useCase.execute(input);

      expect(result.message).toContain('dev');
    });
  });
});
