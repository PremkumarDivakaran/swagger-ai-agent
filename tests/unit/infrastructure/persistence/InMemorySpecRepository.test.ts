/**
 * Tests for InMemorySpecRepository
 */

import { InMemorySpecRepository } from '../../../../src/infrastructure/persistence/InMemorySpecRepository';
import { createNormalizedSpec, NormalizedSpec } from '../../../../src/domain/models/NormalizedSpec';
import { createOperation } from '../../../../src/domain/models/Operation';
import { v4 as uuidv4 } from 'uuid';

describe('InMemorySpecRepository', () => {
  let repository: InMemorySpecRepository;
  
  const createTestSpec = (overrides: Partial<NormalizedSpec> = {}): NormalizedSpec => {
    return createNormalizedSpec({
      id: uuidv4(),
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      servers: [{ url: 'https://api.example.com' }],
      operations: [
        createOperation({
          operationId: 'testOp',
          method: 'GET',
          path: '/test',
          responses: [],
        }),
      ],
      metadata: {
        sourceLocation: 'https://api.example.com/spec.json',
        sourceType: 'url',
        importedAt: new Date(),
      },
      ...overrides,
    });
  };

  beforeEach(() => {
    repository = new InMemorySpecRepository();
  });

  describe('create', () => {
    it('should create a new spec', async () => {
      const spec = createTestSpec();
      
      const created = await repository.create(spec);
      
      expect(created.id).toBeDefined();
      expect(created.info.title).toBe('Test API');
    });

    it('should preserve existing ID', async () => {
      const spec = createTestSpec({ id: 'existing-id' });
      
      const created = await repository.create(spec);
      
      expect(created.id).toBe('existing-id');
    });
  });

  describe('findById', () => {
    it('should find spec by ID', async () => {
      const spec = createTestSpec();
      await repository.create(spec);
      
      const found = await repository.findById(spec.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(spec.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent');
      
      expect(found).toBeNull();
    });
  });

  describe('find', () => {
    it('should return all specs when no filter', async () => {
      await repository.create(createTestSpec());
      await repository.create(createTestSpec());
      
      const result = await repository.find();
      
      expect(result.items.length).toBe(2);
    });

    it('should filter by title', async () => {
      await repository.create(createTestSpec({ info: { title: 'First API', version: '1.0' } }));
      await repository.create(createTestSpec({ info: { title: 'Second API', version: '1.0' } }));
      
      const result = await repository.find({ title: 'First' });
      
      expect(result.items.length).toBe(1);
      expect(result.items[0].info.title).toBe('First API');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create(createTestSpec());
      }
      
      const result = await repository.find({ page: 1, limit: 2 });
      
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete existing spec', async () => {
      const spec = createTestSpec();
      await repository.create(spec);
      
      const deleted = await repository.delete(spec.id);
      
      expect(deleted).toBe(true);
      const found = await repository.findById(spec.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await repository.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('update', () => {
    it('should update existing spec', async () => {
      const spec = createTestSpec();
      await repository.create(spec);
      
      const updated = { ...spec, info: { ...spec.info, title: 'Updated Title' } };
      const result = await repository.update(updated);
      
      expect(result.info.title).toBe('Updated Title');
    });

    it('should throw error for non-existent spec', async () => {
      const spec = createTestSpec();
      
      await expect(repository.update(spec)).rejects.toThrow();
    });
  });

  describe('findBySourceLocation', () => {
    it('should find spec by source location', async () => {
      const spec = createTestSpec({
        metadata: {
          sourceLocation: 'https://unique.example.com/spec.json',
          sourceType: 'url',
          importedAt: new Date(),
        },
      });
      await repository.create(spec);
      
      const found = await repository.findBySourceLocation('https://unique.example.com/spec.json');
      
      expect(found).toBeDefined();
      expect(found?.metadata.sourceLocation).toBe('https://unique.example.com/spec.json');
    });

    it('should return null if not found', async () => {
      const found = await repository.findBySourceLocation('https://nonexistent.com/spec.json');
      
      expect(found).toBeNull();
    });
  });
});
