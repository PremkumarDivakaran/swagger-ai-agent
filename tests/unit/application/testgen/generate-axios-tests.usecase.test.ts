/**
 * Unit tests for GenerateAxiosTestsUseCase
 */

import { GenerateAxiosTestsUseCase } from '../../../../src/application/testgen/generate-axios-tests.usecase';
import { ISpecRepository, IEnvironmentRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec, createNormalizedSpec } from '../../../../src/domain/models/NormalizedSpec';
import { Operation, createOperation } from '../../../../src/domain/models/Operation';
import { NotFoundError } from '../../../../src/core/errors/NotFoundError';
import { ValidationError } from '../../../../src/core/errors/ValidationError';

describe('GenerateAxiosTestsUseCase', () => {
  let useCase: GenerateAxiosTestsUseCase;
  let mockSpecRepo: jest.Mocked<ISpecRepository>;
  let mockEnvRepo: jest.Mocked<IEnvironmentRepository>;

  // Helper to create a mock spec
  const createMockSpec = (overrides: Partial<NormalizedSpec> = {}): NormalizedSpec => {
    return createNormalizedSpec({
      id: 'spec-123',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      openApiVersion: '3.0.0',
      servers: [{ url: 'https://api.test.com' }],
      metadata: {
        sourceType: 'url',
        sourceLocation: 'https://api.test.com/openapi.json',
        importedAt: new Date(),
      },
      operations: [
        createOperation({
          operationId: 'getPets',
          method: 'GET',
          path: '/pets',
          summary: 'Get all pets',
          tags: ['pet'],
          parameters: [],
          responses: [{ statusCode: '200', description: 'Success' }],
        }),
        createOperation({
          operationId: 'createPet',
          method: 'POST',
          path: '/pets',
          summary: 'Create a pet',
          tags: ['pet'],
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                  },
                  required: ['name'],
                },
                example: { name: 'Fluffy', age: 3 },
              },
            },
          },
          responses: [{ statusCode: '201', description: 'Created' }],
        }),
        createOperation({
          operationId: 'getPetById',
          method: 'GET',
          path: '/pets/{petId}',
          summary: 'Get pet by ID',
          tags: ['pet'],
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          responses: [{ statusCode: '200', description: 'Success' }],
          security: [{ schemeName: 'bearerAuth', scopes: [] }],
        }),
      ],
      ...overrides,
    });
  };

  beforeEach(() => {
    mockSpecRepo = {
      findById: jest.fn(),
      findBySourceLocation: jest.fn(),
      find: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      existsBySource: jest.fn(),
    };

    mockEnvRepo = {
      findById: jest.fn(),
      findBySpecId: jest.fn(),
      findBySpecIdAndName: jest.fn(),
      findDefaultBySpecId: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      setAsDefault: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      deleteBySpecId: jest.fn(),
    };

    useCase = new GenerateAxiosTestsUseCase(mockSpecRepo, mockEnvRepo);
  });

  describe('execute', () => {
    it('should generate tests for all operations when no selection is provided', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
      });

      expect(result.specId).toBe('spec-123');
      expect(result.specTitle).toBe('Test API');
      expect(result.operationCount).toBe(3);
      expect(result.testCount).toBeGreaterThanOrEqual(3); // At least happy path for each
      expect(result.code).toContain('import axios');
      expect(result.code).toContain("describe('Test API API Tests'");
      expect(result.fileName).toBe('test-api.test.ts');
    });

    it('should throw NotFoundError when spec does not exist', async () => {
      mockSpecRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ specId: 'non-existent' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when no operations match selection', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      await expect(
        useCase.execute({
          specId: 'spec-123',
          selection: {
            mode: 'tag',
            tags: ['non-existent-tag'],
          },
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should filter operations by tag when tag selection is provided', async () => {
      const mockSpec = createMockSpec({
        operations: [
          createOperation({
            operationId: 'getPets',
            method: 'GET',
            path: '/pets',
            tags: ['pet'],
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
          }),
          createOperation({
            operationId: 'getUsers',
            method: 'GET',
            path: '/users',
            tags: ['user'],
            parameters: [],
            responses: [{ statusCode: '200', description: 'Success' }],
          }),
        ],
      });
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: {
          mode: 'tag',
          tags: ['pet'],
        },
      });

      expect(result.operationCount).toBe(1);
      expect(result.testCases.every(tc => tc.operationId === 'getPets')).toBe(true);
    });

    it('should filter operations by single operation ID', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: {
          mode: 'single',
          operationId: 'getPets',
        },
      });

      expect(result.operationCount).toBe(1);
      expect(result.testCases.every(tc => tc.operationId === 'getPets')).toBe(true);
    });

    it('should apply exclusions to operations', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: {
          mode: 'full',
          exclude: ['createPet'],
        },
      });

      expect(result.operationCount).toBe(2);
      expect(result.testCases.every(tc => tc.operationId !== 'createPet')).toBe(true);
    });

    it('should include negative tests when option is enabled', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        options: {
          includeNegativeTests: true,
        },
      });

      const hasValidationErrorTests = result.testCases.some(tc => tc.type === 'validation-error');
      expect(hasValidationErrorTests).toBe(true);
    });

    it('should include auth tests when option is enabled and operation has security', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        options: {
          includeAuthTests: true,
        },
      });

      const hasAuthErrorTests = result.testCases.some(tc => tc.type === 'auth-error');
      expect(hasAuthErrorTests).toBe(true);
    });

    it('should generate code with correct structure', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
      });

      // Check imports
      expect(result.code).toContain('import axios');
      expect(result.code).toContain('AxiosInstance');

      // Check constants
      expect(result.code).toContain('BASE_URL');
      expect(result.code).toContain('https://api.test.com');

      // Check helper functions
      expect(result.code).toContain('function buildUrl');
      expect(result.code).toContain('isSuccessStatus');

      // Check describe blocks
      expect(result.code).toContain("describe('Test API API Tests'");
      expect(result.code).toContain("describe('/pets'");

      // Check it blocks
      expect(result.code).toContain('it(');
      expect(result.code).toContain('expect(response.status)');
    });

    it('should generate tests with path parameters', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: {
          mode: 'single',
          operationId: 'getPetById',
        },
      });

      expect(result.code).toContain('pathParams');
      expect(result.code).toContain('buildUrl');
    });

    it('should generate tests with request body', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: {
          mode: 'single',
          operationId: 'createPet',
        },
      });

      expect(result.code).toContain('requestBody');
      expect(result.code).toContain('Fluffy'); // From example
    });

    it('should use custom base URL variable name when provided', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        options: {
          baseUrlVariable: 'API_URL',
        },
      });

      expect(result.code).toContain('API_URL');
    });

    it('should generate tests grouped by tag when option is enabled', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        options: {
          groupByTag: true,
        },
      });

      expect(result.code).toContain("describe('pet'");
    });
  });

  describe('test case generation', () => {
    it('should generate happy path test with correct expected status', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: { mode: 'single', operationId: 'getPets' },
      });

      const happyPathTest = result.testCases.find(tc => tc.type === 'happy-path');
      expect(happyPathTest).toBeDefined();
      expect(happyPathTest!.expectedStatus).toBe(200);
      expect(happyPathTest!.method).toBe('GET');
    });

    it('should generate POST happy path with 201 status', async () => {
      const mockSpec = createMockSpec();
      mockSpecRepo.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute({
        specId: 'spec-123',
        selection: { mode: 'single', operationId: 'createPet' },
      });

      const happyPathTest = result.testCases.find(tc => tc.type === 'happy-path');
      expect(happyPathTest).toBeDefined();
      expect(happyPathTest!.expectedStatus).toBe(201);
    });
  });
});
