/**
 * InMemorySpecRepository
 * In-memory implementation of ISpecRepository
 */

import {
  ISpecRepository,
  FindSpecsOptions,
  PaginatedResult,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from '../../domain/repositories';
import { NormalizedSpec } from '../../domain/models';

/**
 * InMemorySpecRepository class
 * Stores specs in memory using a Map
 */
export class InMemorySpecRepository implements ISpecRepository {
  private specs: Map<string, NormalizedSpec> = new Map();

  async create(spec: NormalizedSpec): Promise<NormalizedSpec> {
    this.specs.set(spec.id, spec);
    return spec;
  }

  async update(spec: NormalizedSpec): Promise<NormalizedSpec> {
    if (!this.specs.has(spec.id)) {
      throw new Error(`Spec not found: ${spec.id}`);
    }
    this.specs.set(spec.id, spec);
    return spec;
  }

  async delete(id: string): Promise<boolean> {
    return this.specs.delete(id);
  }

  async findById(id: string): Promise<NormalizedSpec | null> {
    return this.specs.get(id) ?? null;
  }

  async find(options?: FindSpecsOptions): Promise<PaginatedResult<NormalizedSpec>> {
    const opts = { ...getDefaultPaginationOptions(), ...options };
    let items = Array.from(this.specs.values());

    // Apply filters
    if (opts.title) {
      const titleLower = opts.title.toLowerCase();
      items = items.filter(s => s.info.title.toLowerCase().includes(titleLower));
    }

    if (opts.version) {
      items = items.filter(s => s.info.version === opts.version);
    }

    if (opts.sourceType) {
      items = items.filter(s => s.metadata.sourceType === opts.sourceType);
    }

    if (opts.tag) {
      items = items.filter(s => 
        s.operations.some(op => op.tags.includes(opts.tag!))
      );
    }

    // Sort
    items.sort((a, b) => {
      const aVal = this.getSortValue(a, opts.sortBy);
      const bVal = this.getSortValue(b, opts.sortBy);
      const cmp = (aVal as string | number) < (bVal as string | number) ? -1 : (aVal as string | number) > (bVal as string | number) ? 1 : 0;
      return opts.sortOrder === 'desc' ? -cmp : cmp;
    });

    // Paginate
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    const pageItems = items.slice(start, start + opts.limit);

    return createPaginatedResult(pageItems, total, opts.page, opts.limit);
  }

  async findBySourceLocation(sourceLocation: string): Promise<NormalizedSpec | null> {
    for (const spec of this.specs.values()) {
      if (spec.metadata.sourceLocation === sourceLocation) {
        return spec;
      }
    }
    return null;
  }

  async findAll(): Promise<NormalizedSpec[]> {
    return Array.from(this.specs.values());
  }

  async count(options?: Omit<FindSpecsOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const result = await this.find({ ...options, page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.total;
  }

  async exists(id: string): Promise<boolean> {
    return this.specs.has(id);
  }

  async existsBySource(sourceLocation: string): Promise<boolean> {
    const spec = await this.findBySourceLocation(sourceLocation);
    return spec !== null;
  }

  async findByTitleAndVersion(title: string, version: string): Promise<NormalizedSpec | null> {
    for (const spec of this.specs.values()) {
      if (spec.info.title === title && spec.info.version === version) {
        return spec;
      }
    }
    return null;
  }

  /**
   * Clear all specs (useful for testing)
   */
  clear(): void {
    this.specs.clear();
  }

  private getSortValue(spec: NormalizedSpec, sortBy?: string): unknown {
    switch (sortBy) {
      case 'title':
        return spec.info.title;
      case 'version':
        return spec.info.version;
      case 'createdAt':
      default:
        return spec.metadata.importedAt;
    }
  }
}

/**
 * Creates an InMemorySpecRepository instance
 * @returns InMemorySpecRepository instance
 */
export function createInMemorySpecRepository(): InMemorySpecRepository {
  return new InMemorySpecRepository();
}
