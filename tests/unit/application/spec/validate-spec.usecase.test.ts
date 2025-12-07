/**
 * Unit tests for ValidateSpecUseCase
 */

import { ValidateSpecUseCase, ValidateSpecInput } from '../../../../src/application/spec';
import { SwaggerParserAdapter } from '../../../../src/infrastructure/swagger/SwaggerParserAdapter';
import { ISpecRepository } from '../../../../src/domain/repositories';
import { NormalizedSpec } from '../../../../src/domain/models';
import { NotFoundError } from '../../../../src/core/errors';

// Mock implementations
const mockSwaggerParser = {
  parse: jest.fn(),
  validate: jest.fn(),
};

const mockSpecRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ValidateSpecUseCase', () => {
  let useCase: ValidateSpecUseCase;
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

    useCase = new ValidateSpecUseCase(
      mockSwaggerParser as unknown as SwaggerParserAdapter,
      mockSpecRepository as unknown as ISpecRepository
    );
  });

  describe('execute', () => {
    it('should validate spec by specId successfully', async () => {
      const input: ValidateSpecInput = {
        specId: 'spec-123',
      };

      mockSpecRepository.findById.mockResolvedValue(mockSpec);

      const result = await useCase.execute(input);

      expect(mockSpecRepository.findById).toHaveBeenCalledWith('spec-123');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent specId', async () => {
      const input: ValidateSpecInput = {
        specId: 'non-existent',
      };

      mockSpecRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('should validate raw spec content as string', async () => {
      const input: ValidateSpecInput = {
        rawSpec: JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        }),
      };

      mockSwaggerParser.parse.mockResolvedValue({
        spec: { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} },
        version: '3.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await useCase.execute(input);

      expect(result.valid).toBe(true);
      expect(result.version).toBe('3.0');
    });

    it('should validate raw spec content as object', async () => {
      const input: ValidateSpecInput = {
        rawSpec: {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        },
      };

      mockSwaggerParser.parse.mockResolvedValue({
        spec: { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} },
        version: '3.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await useCase.execute(input);

      expect(result.valid).toBe(true);
    });

    it('should return validation issues for invalid spec', async () => {
      const input: ValidateSpecInput = {
        rawSpec: 'invalid: spec: content',
      };

      mockSwaggerParser.parse.mockResolvedValue({
        spec: { invalid: 'spec' },
        version: '3.0',
        valid: false,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: false,
        errors: [{ path: '', message: 'Spec validation failed', severity: 'error' }],
      });

      const result = await useCase.execute(input);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect Swagger 2.0 specs', async () => {
      const input: ValidateSpecInput = {
        rawSpec: {
          swagger: '2.0',
          info: { title: 'Legacy', version: '1.0.0' },
          paths: {},
        },
      };

      mockSwaggerParser.parse.mockResolvedValue({
        spec: { swagger: '2.0', info: { title: 'Legacy', version: '1.0.0' }, paths: {} },
        version: '2.0',
        valid: true,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await useCase.execute(input);

      expect(result.valid).toBe(true);
      expect(result.version).toBe('2.0');
    });

    it('should include summary counts in result', async () => {
      const input: ValidateSpecInput = {
        rawSpec: 'invalid spec',
      };

      mockSwaggerParser.parse.mockResolvedValue({
        spec: {},
        version: '3.0',
        valid: false,
        warnings: [],
      });
      mockSwaggerParser.validate.mockResolvedValue({
        valid: false,
        errors: [{ path: '', message: 'Multiple errors', severity: 'error' }],
      });

      const result = await useCase.execute(input);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary.errors).toBe('number');
      expect(typeof result.summary.warnings).toBe('number');
      expect(typeof result.summary.info).toBe('number');
    });
  });
});
