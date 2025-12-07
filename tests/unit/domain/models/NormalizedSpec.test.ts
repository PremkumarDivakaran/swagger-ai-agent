/**
 * Unit tests for NormalizedSpec domain model
 */

import {
  NormalizedSpec,
  createNormalizedSpec,
  getOperationCount,
  getOperationsByTag,
  getAllTags,
  getTagStats,
  findOperation,
  getDefaultServerUrl,
} from '../../../../src/domain/models/NormalizedSpec';
import { createOperation } from '../../../../src/domain/models/Operation';

describe('NormalizedSpec', () => {
  const createTestSpec = (): NormalizedSpec => {
    return createNormalizedSpec({
      id: 'spec-1',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'A test API',
      },
      metadata: {
        sourceType: 'url',
        sourceLocation: 'https://api.example.com/openapi.json',
        importedAt: new Date('2024-01-01'),
      },
      servers: [
        { url: 'https://api.example.com/v1', description: 'Production' },
        { url: 'https://staging.example.com/v1', description: 'Staging' },
      ],
      operations: [
        createOperation({ operationId: 'getUsers', method: 'GET', path: '/users', tags: ['users'] }),
        createOperation({ operationId: 'createUser', method: 'POST', path: '/users', tags: ['users'] }),
        createOperation({ operationId: 'getItems', method: 'GET', path: '/items', tags: ['items'] }),
      ],
    });
  };

  describe('createNormalizedSpec', () => {
    it('should create a spec with required fields', () => {
      const spec = createNormalizedSpec({
        id: 'spec-1',
        info: { title: 'Test API', version: '1.0.0' },
        metadata: {
          sourceType: 'file',
          sourceLocation: '/path/to/spec.yaml',
          importedAt: new Date(),
        },
      });

      expect(spec.id).toBe('spec-1');
      expect(spec.info.title).toBe('Test API');
      expect(spec.openApiVersion).toBe('3.0.0'); // default
      expect(spec.servers).toEqual([]);
      expect(spec.operations).toEqual([]);
    });

    it('should create a spec with all fields', () => {
      const spec = createTestSpec();

      expect(spec.id).toBe('spec-1');
      expect(spec.info.title).toBe('Test API');
      expect(spec.servers).toHaveLength(2);
      expect(spec.operations).toHaveLength(3);
    });
  });

  describe('getOperationCount', () => {
    it('should return the number of operations', () => {
      const spec = createTestSpec();
      expect(getOperationCount(spec)).toBe(3);
    });

    it('should return 0 for empty spec', () => {
      const spec = createNormalizedSpec({
        id: 'empty',
        info: { title: 'Empty', version: '1.0.0' },
        metadata: { sourceType: 'file', sourceLocation: '', importedAt: new Date() },
      });
      expect(getOperationCount(spec)).toBe(0);
    });
  });

  describe('getOperationsByTag', () => {
    it('should return operations with specified tag', () => {
      const spec = createTestSpec();
      
      const userOps = getOperationsByTag(spec, 'users');
      expect(userOps).toHaveLength(2);
      expect(userOps.every(op => op.tags.includes('users'))).toBe(true);
    });

    it('should return empty array for non-existent tag', () => {
      const spec = createTestSpec();
      expect(getOperationsByTag(spec, 'nonexistent')).toEqual([]);
    });
  });

  describe('getAllTags', () => {
    it('should return all unique tags', () => {
      const spec = createTestSpec();
      const tags = getAllTags(spec);

      expect(tags).toHaveLength(2);
      expect(tags).toContain('users');
      expect(tags).toContain('items');
    });
  });

  describe('getTagStats', () => {
    it('should return operation count per tag', () => {
      const spec = createTestSpec();
      const stats = getTagStats(spec);

      expect(stats.get('users')).toBe(2);
      expect(stats.get('items')).toBe(1);
    });
  });

  describe('findOperation', () => {
    it('should find operation by ID', () => {
      const spec = createTestSpec();
      const op = findOperation(spec, 'getUsers');

      expect(op).toBeDefined();
      expect(op?.operationId).toBe('getUsers');
    });

    it('should return undefined for non-existent operation', () => {
      const spec = createTestSpec();
      expect(findOperation(spec, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getDefaultServerUrl', () => {
    it('should return the first server URL', () => {
      const spec = createTestSpec();
      expect(getDefaultServerUrl(spec)).toBe('https://api.example.com/v1');
    });

    it('should return empty string for spec without servers', () => {
      const spec = createNormalizedSpec({
        id: 'no-servers',
        info: { title: 'No Servers', version: '1.0.0' },
        metadata: { sourceType: 'file', sourceLocation: '', importedAt: new Date() },
      });
      expect(getDefaultServerUrl(spec)).toBe('');
    });
  });
});
