/**
 * InMemoryEnvironmentRepository
 * In-memory implementation of IEnvironmentRepository
 */

import {
  IEnvironmentRepository,
  FindEnvironmentsOptions,
  PaginatedResult,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from '../../domain/repositories';
import { EnvironmentConfig } from '../../domain/models';

/**
 * InMemoryEnvironmentRepository class
 * Stores environments in memory using a Map
 */
export class InMemoryEnvironmentRepository implements IEnvironmentRepository {
  private environments: Map<string, EnvironmentConfig> = new Map();

  async create(env: EnvironmentConfig): Promise<EnvironmentConfig> {
    this.environments.set(env.id, env);
    return env;
  }

  async update(env: EnvironmentConfig): Promise<EnvironmentConfig> {
    if (!this.environments.has(env.id)) {
      throw new Error(`Environment not found: ${env.id}`);
    }
    const updated = { ...env, updatedAt: new Date() };
    this.environments.set(env.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.environments.delete(id);
  }

  async findById(id: string): Promise<EnvironmentConfig | null> {
    return this.environments.get(id) ?? null;
  }

  async find(options?: FindEnvironmentsOptions): Promise<PaginatedResult<EnvironmentConfig>> {
    const opts = { ...getDefaultPaginationOptions(), ...options };
    let items = Array.from(this.environments.values());

    // Apply filters
    if (opts.specId) {
      items = items.filter(e => e.specId === opts.specId);
    }

    if (opts.name) {
      const nameLower = opts.name.toLowerCase();
      items = items.filter(e => e.name.toLowerCase().includes(nameLower));
    }

    if (opts.authType) {
      items = items.filter(e => e.authConfig.type === opts.authType);
    }

    if (opts.isDefault !== undefined) {
      items = items.filter(e => e.isDefault === opts.isDefault);
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

  async findBySpecId(specId: string): Promise<EnvironmentConfig[]> {
    return Array.from(this.environments.values())
      .filter(e => e.specId === specId);
  }

  async findBySpecIdAndName(specId: string, name: string): Promise<EnvironmentConfig | null> {
    for (const env of this.environments.values()) {
      if (env.specId === specId && env.name === name) {
        return env;
      }
    }
    return null;
  }

  async findDefaultBySpecId(specId: string): Promise<EnvironmentConfig | null> {
    for (const env of this.environments.values()) {
      if (env.specId === specId && env.isDefault) {
        return env;
      }
    }
    return null;
  }

  async setAsDefault(id: string): Promise<EnvironmentConfig> {
    const env = this.environments.get(id);
    if (!env) {
      throw new Error(`Environment not found: ${id}`);
    }

    // Clear default flag from other environments for the same spec
    for (const e of this.environments.values()) {
      if (e.specId === env.specId && e.id !== id && e.isDefault) {
        this.environments.set(e.id, { ...e, isDefault: false, updatedAt: new Date() });
      }
    }

    // Set this environment as default
    const updated = { ...env, isDefault: true, updatedAt: new Date() };
    this.environments.set(id, updated);
    return updated;
  }

  async count(options?: Omit<FindEnvironmentsOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const result = await this.find({ ...options, page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.total;
  }

  async exists(id: string): Promise<boolean> {
    return this.environments.has(id);
  }

  async deleteBySpecId(specId: string): Promise<number> {
    let count = 0;
    for (const [id, env] of this.environments.entries()) {
      if (env.specId === specId) {
        this.environments.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all environments (useful for testing)
   */
  clear(): void {
    this.environments.clear();
  }

  private getSortValue(env: EnvironmentConfig, sortBy?: string): unknown {
    switch (sortBy) {
      case 'name':
        return env.name;
      case 'baseUrl':
        return env.baseUrl;
      case 'createdAt':
      default:
        return env.createdAt;
    }
  }
}

/**
 * Creates an InMemoryEnvironmentRepository instance
 * @returns InMemoryEnvironmentRepository instance
 */
export function createInMemoryEnvironmentRepository(): InMemoryEnvironmentRepository {
  return new InMemoryEnvironmentRepository();
}
