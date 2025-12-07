/**
 * CreateEnvironmentUseCase tests
 */

import { CreateEnvironmentUseCase, CreateEnvironmentInput } from '../../../../src/application/environment';
import { IEnvironmentRepository, ISpecRepository } from '../../../../src/domain/repositories';
import { EnvironmentConfig, NormalizedSpec } from '../../../../src/domain/models';
import { NotFoundError, ValidationError, ConflictError } from '../../../../src/core/errors';

describe('CreateEnvironmentUseCase', () => {
  let useCase: CreateEnvironmentUseCase;
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

    useCase = new CreateEnvironmentUseCase(mockEnvironmentRepository, mockSpecRepository);
  });

  describe('execute', () => {
    const validInput: CreateEnvironmentInput = {
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
    };

    it('should create environment successfully', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecIdAndName.mockResolvedValue(null);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);
      mockEnvironmentRepository.create.mockImplementation(async (env) => env);

      const result = await useCase.execute(validInput);

      expect(result.specId).toBe('spec-123');
      expect(result.name).toBe('dev');
      expect(result.baseUrl).toBe('https://dev.api.example.com');
      expect(result.isDefault).toBe(true); // First env becomes default
      expect(result.envId).toBeDefined();
      expect(mockEnvironmentRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError if spec does not exist', async () => {
      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if environment name already exists', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecIdAndName.mockResolvedValue({
        id: 'existing-env',
        specId: 'spec-123',
        name: 'dev',
        baseUrl: 'https://existing.api.example.com',
        defaultHeaders: {},
        authConfig: { type: 'none' },
        variables: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(useCase.execute(validInput)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid base URL', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecIdAndName.mockResolvedValue(null);

      const invalidInput = { ...validInput, baseUrl: 'not-a-valid-url' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should set first environment as default automatically', async () => {
      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecIdAndName.mockResolvedValue(null);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([]);
      mockEnvironmentRepository.create.mockImplementation(async (env) => env);

      const result = await useCase.execute({ ...validInput, isDefault: false });

      expect(result.isDefault).toBe(true);
    });

    it('should not set as default if other environments exist', async () => {
      const existingEnv: EnvironmentConfig = {
        id: 'existing-env',
        specId: 'spec-123',
        name: 'prod',
        baseUrl: 'https://prod.api.example.com',
        defaultHeaders: {},
        authConfig: { type: 'none' },
        variables: {},
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);
      mockEnvironmentRepository.findBySpecIdAndName.mockResolvedValue(null);
      mockEnvironmentRepository.findBySpecId.mockResolvedValue([existingEnv]);
      mockEnvironmentRepository.create.mockImplementation(async (env) => env);

      const result = await useCase.execute({ ...validInput, isDefault: false });

      expect(result.isDefault).toBe(false);
    });
  });
});
