/**
 * Tests for OpenApiNormalizer
 */

import { OpenApiNormalizer } from '../../../../src/infrastructure/swagger/OpenApiNormalizer';
import { OpenApiVersionType } from '../../../../src/infrastructure/swagger/SwaggerParserAdapter';
import { SpecMetadata } from '../../../../src/domain/models';

describe('OpenApiNormalizer', () => {
  let normalizer: OpenApiNormalizer;

  const createMetadata = (overrides: Partial<SpecMetadata> = {}): SpecMetadata => ({
    sourceLocation: 'test.json',
    sourceType: 'file',
    importedAt: new Date(),
    ...overrides,
  });

  const openApi3Spec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'A test API specification',
    },
    servers: [
      { url: 'https://api.example.com', description: 'Production' },
      { url: 'https://staging.example.com', description: 'Staging' },
    ],
    paths: {
      '/users': {
        get: {
          operationId: 'getUsers',
          summary: 'Get all users',
          tags: ['Users'],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createUser',
          summary: 'Create a user',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
          },
        },
      },
      '/users/{id}': {
        get: {
          operationId: 'getUser',
          summary: 'Get user by ID',
          tags: ['Users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Success' },
            '404': { description: 'Not found' },
          },
        },
      },
    },
    tags: [
      { name: 'Users', description: 'User operations' },
    ],
  };

  const swagger2Spec = {
    swagger: '2.0',
    info: {
      title: 'Legacy API',
      version: '1.0.0',
    },
    host: 'api.example.com',
    basePath: '/v1',
    schemes: ['https'],
    paths: {
      '/products': {
        get: {
          operationId: 'listProducts',
          summary: 'List products',
          tags: ['Products'],
          produces: ['application/json'],
          responses: {
            '200': {
              description: 'Success',
              schema: { type: 'array' },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    normalizer = new OpenApiNormalizer();
  });

  describe('normalize', () => {
    describe('OpenAPI 3.x', () => {
      it('should normalize OpenAPI 3.0 spec', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata({ sourceLocation: 'https://api.example.com/spec.json' })
        );

        expect(result.info.title).toBe('Test API');
        expect(result.servers).toHaveLength(2);
      });

      it('should extract all operations', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata()
        );

        expect(result.operations).toHaveLength(3);
        expect(result.operations.map(op => op.operationId)).toContain('getUsers');
        expect(result.operations.map(op => op.operationId)).toContain('createUser');
        expect(result.operations.map(op => op.operationId)).toContain('getUser');
      });

      it('should set correct HTTP methods', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata()
        );

        const getUsers = result.operations.find(op => op.operationId === 'getUsers');
        const createUser = result.operations.find(op => op.operationId === 'createUser');

        expect(getUsers?.method).toBe('GET');
        expect(createUser?.method).toBe('POST');
      });

      it('should normalize parameters', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata()
        );

        const getUser = result.operations.find(op => op.operationId === 'getUser');
        expect(getUser?.parameters).toHaveLength(1);
        expect(getUser?.parameters[0].name).toBe('id');
        expect(getUser?.parameters[0].in).toBe('path');
        expect(getUser?.parameters[0].required).toBe(true);
      });

      it('should normalize request body', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata()
        );

        const createUser = result.operations.find(op => op.operationId === 'createUser');
        expect(createUser?.requestBody).toBeDefined();
        expect(createUser?.requestBody?.required).toBe(true);
        expect(createUser?.requestBody?.content).toHaveProperty('application/json');
      });

      it('should normalize tags', () => {
        const result = normalizer.normalize(
          openApi3Spec as any,
          '3.0' as OpenApiVersionType,
          createMetadata()
        );

        expect(result.tags).toHaveLength(1);
        expect(result.tags[0].name).toBe('Users');
        expect(result.tags[0].description).toBe('User operations');
      });
    });

    describe('Swagger 2.0', () => {
      it('should normalize Swagger 2.0 spec', () => {
        const result = normalizer.normalize(
          swagger2Spec as any,
          '2.0' as OpenApiVersionType,
          createMetadata({ sourceLocation: 'legacy.json' })
        );

        expect(result.info.title).toBe('Legacy API');
      });

      it('should construct server URL from host, basePath, and schemes', () => {
        const result = normalizer.normalize(
          swagger2Spec as any,
          '2.0' as OpenApiVersionType,
          createMetadata()
        );

        expect(result.servers).toHaveLength(1);
        expect(result.servers[0].url).toBe('https://api.example.com/v1');
      });

      it('should extract operations from Swagger 2.0', () => {
        const result = normalizer.normalize(
          swagger2Spec as any,
          '2.0' as OpenApiVersionType,
          createMetadata()
        );

        expect(result.operations).toHaveLength(1);
        expect(result.operations[0].operationId).toBe('listProducts');
      });
    });
  });

  describe('options', () => {
    it('should generate missing operation IDs when enabled', () => {
      const specWithoutOpId = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              summary: 'Get items',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = normalizer.normalize(
        specWithoutOpId as any,
        '3.0' as OpenApiVersionType,
        createMetadata(),
        { generateMissingOperationIds: true }
      );

      expect(result.operations[0].operationId).toBeDefined();
      expect(result.operations[0].operationId.toLowerCase()).toContain('get');
    });

    it('should include deprecated operations when enabled', () => {
      const specWithDeprecated = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/legacy': {
            get: {
              operationId: 'legacyOp',
              deprecated: true,
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = normalizer.normalize(
        specWithDeprecated as any,
        '3.0' as OpenApiVersionType,
        createMetadata(),
        { includeDeprecated: true }
      );

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].deprecated).toBe(true);
    });

    it('should exclude deprecated operations when disabled', () => {
      const specWithDeprecated = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/legacy': {
            get: {
              operationId: 'legacyOp',
              deprecated: true,
              responses: { '200': { description: 'OK' } },
            },
          },
          '/current': {
            get: {
              operationId: 'currentOp',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = normalizer.normalize(
        specWithDeprecated as any,
        '3.0' as OpenApiVersionType,
        createMetadata(),
        { includeDeprecated: false }
      );

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].operationId).toBe('currentOp');
    });
  });

  describe('metadata', () => {
    it('should include source location in metadata', () => {
      const sourceUrl = 'https://api.example.com/openapi.json';
      const result = normalizer.normalize(
        openApi3Spec as any,
        '3.0' as OpenApiVersionType,
        createMetadata({ sourceLocation: sourceUrl })
      );

      expect(result.metadata.sourceLocation).toBe(sourceUrl);
    });
  });
});
