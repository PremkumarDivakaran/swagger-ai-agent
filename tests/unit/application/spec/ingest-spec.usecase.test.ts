/**
 * Unit tests for IngestSpecUseCase
 */

import { IngestSpecUseCase, IngestSpecInput } from '../../../../src/application/spec';
import { SwaggerLoader } from '../../../../src/infrastructure/swagger/SwaggerLoader';
import { SwaggerParserAdapter } from '../../../../src/infrastructure/swagger/SwaggerParserAdapter';
import { OpenApiNormalizer } from '../../../../src/infrastructure/swagger/OpenApiNormalizer';
import { ISpecRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec } from '../../../../src/domain/models';

// Mock implementations
const mockSwaggerLoader = {
  load: jest.fn(),
};

const mockSwaggerParser = {
  parse: jest.fn(),
  validate: jest.fn(),
};

const mockOpenApiNormalizer = {
  normalize: jest.fn(),
};

const mockSpecRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('IngestSpecUseCase', () => {
  let useCase: IngestSpecUseCase;
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
      servers: [{ url: 'https://api.example.com' }],
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
      ],
      securitySchemes: [],
      tags: [{ name: 'users', description: 'User operations' }],
      globalSecurity: [],
      metadata: {
        importedAt: new Date(),
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
        fileHash: 'abc123',
      },
    };

    useCase = new IngestSpecUseCase(
      mockSwaggerLoader as unknown as SwaggerLoader,
      mockSwaggerParser as unknown as SwaggerParserAdapter,
      mockOpenApiNormalizer as unknown as OpenApiNormalizer,
      mockSpecRepository as unknown as ISpecRepository
    );
  });

  describe('execute', () => {
    it('should successfully ingest spec from URL source', async () => {
      const input: IngestSpecInput = {
        source: {
          type: 'url',
          url: 'https://example.com/api.yaml',
        },
      };

      const rawContent = 'openapi: 3.0.0';
      const parsedSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      mockSwaggerLoader.load.mockResolvedValue({
        content: rawContent,
        contentType: 'yaml',
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
      });
      mockSwaggerParser.parse.mockResolvedValue({
        spec: parsedSpec,
        version: '3.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockOpenApiNormalizer.normalize.mockReturnValue(mockSpec);
      mockSpecRepository.create.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(mockSwaggerLoader.load).toHaveBeenCalledWith(input.source);
      expect(mockSwaggerParser.parse).toHaveBeenCalled();
      expect(mockOpenApiNormalizer.normalize).toHaveBeenCalled();
      expect(mockSpecRepository.create).toHaveBeenCalled();

      expect(result).toMatchObject({
        specId: expect.any(String),
        title: 'Test API',
        version: '1.0.0',
        operationCount: 1,
        sourceLocation: 'https://example.com/api.yaml',
      });
    });

    it('should successfully ingest spec from file source', async () => {
      const input: IngestSpecInput = {
        source: {
          type: 'file',
          path: '/path/to/api.yaml',
        },
      };

      const rawContent = 'swagger: "2.0"';
      const parsedSpec = {
        swagger: '2.0',
        info: { title: 'Legacy API', version: '2.0.0' },
        paths: {},
      };

      mockSwaggerLoader.load.mockResolvedValue({
        content: rawContent,
        contentType: 'yaml',
        sourceLocation: '/path/to/api.yaml',
        sourceType: 'file',
      });
      mockSwaggerParser.parse.mockResolvedValue({
        spec: parsedSpec,
        version: '2.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockOpenApiNormalizer.normalize.mockReturnValue({
        ...mockSpec,
        openApiVersion: '2.0',
      });
      mockSpecRepository.create.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(mockSwaggerLoader.load).toHaveBeenCalledWith(input.source);
      expect(result.specId).toBeDefined();
    });

    it('should throw error when spec parsing fails', async () => {
      const input: IngestSpecInput = {
        source: {
          type: 'url',
          url: 'https://example.com/invalid.yaml',
        },
      };

      mockSwaggerLoader.load.mockResolvedValue({
        content: 'invalid yaml content',
        contentType: 'yaml',
        sourceLocation: 'https://example.com/invalid.yaml',
        sourceType: 'url',
      });
      mockSwaggerParser.parse.mockRejectedValue(new Error('Invalid YAML'));

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw ValidationError when validation fails', async () => {
      const input: IngestSpecInput = {
        source: {
          type: 'url',
          url: 'https://example.com/api.yaml',
        },
      };

      mockSwaggerLoader.load.mockResolvedValue({
        content: 'openapi: 3.0.0',
        contentType: 'yaml',
        sourceLocation: 'https://example.com/api.yaml',
        sourceType: 'url',
      });
      mockSwaggerParser.parse.mockResolvedValue({
        spec: { openapi: '3.0.0' },
        version: '3.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: false,
        errors: [{ path: 'info', message: 'Missing info object', severity: 'error' }],
      });

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should handle git source', async () => {
      const input: IngestSpecInput = {
        source: {
          type: 'git',
          repo: 'github.com/org/repo',
          ref: 'main',
          filePath: 'api/spec.yaml',
        },
      };

      mockSwaggerLoader.load.mockResolvedValue({
        content: 'openapi: 3.0.0',
        contentType: 'yaml',
        sourceLocation: 'git://github.com/org/repo#main:api/spec.yaml',
        sourceType: 'git',
      });
      mockSwaggerParser.parse.mockResolvedValue({
        spec: { openapi: '3.0.0', info: { title: 'Git API', version: '1.0.0' }, paths: {} },
        version: '3.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockOpenApiNormalizer.normalize.mockReturnValue(mockSpec);
      mockSpecRepository.create.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(mockSwaggerLoader.load).toHaveBeenCalledWith(input.source);
      expect(result.specId).toBeDefined();
    });
  });
});
