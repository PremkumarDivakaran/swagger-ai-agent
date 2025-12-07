/**
 * InMemoryTestTemplateRepository
 * In-memory implementation of ITestTemplateRepository
 */

import {
  ITestTemplateRepository,
  FindTemplatesOptions,
  PaginatedResult,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from '../../domain/repositories';
import { PayloadTemplate } from '../../domain/models';

/**
 * InMemoryTestTemplateRepository class
 * Stores templates in memory using a Map
 */
export class InMemoryTestTemplateRepository implements ITestTemplateRepository {
  private templates: Map<string, PayloadTemplate> = new Map();

  async create(template: PayloadTemplate): Promise<PayloadTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async createMany(templates: PayloadTemplate[]): Promise<PayloadTemplate[]> {
    for (const template of templates) {
      this.templates.set(template.id, template);
    }
    return templates;
  }

  async update(template: PayloadTemplate): Promise<PayloadTemplate> {
    if (!this.templates.has(template.id)) {
      throw new Error(`Template not found: ${template.id}`);
    }
    const updated = { ...template, updatedAt: new Date() };
    this.templates.set(template.id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  async findById(id: string): Promise<PayloadTemplate | null> {
    return this.templates.get(id) ?? null;
  }

  async find(options?: FindTemplatesOptions): Promise<PaginatedResult<PayloadTemplate>> {
    const opts = { ...getDefaultPaginationOptions(), ...options };
    let items = Array.from(this.templates.values());

    // Apply filters
    if (opts.operationId) {
      items = items.filter(t => t.operationId === opts.operationId);
    }

    if (opts.name) {
      const nameLower = opts.name.toLowerCase();
      items = items.filter(t => t.name.toLowerCase().includes(nameLower));
    }

    if (opts.contentType) {
      items = items.filter(t => t.contentType === opts.contentType);
    }

    if (opts.tag) {
      items = items.filter(t => t.tags.includes(opts.tag!));
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

  async findByOperationId(operationId: string): Promise<PayloadTemplate[]> {
    return Array.from(this.templates.values())
      .filter(t => t.operationId === operationId);
  }

  async findByOperationIds(operationIds: string[]): Promise<PayloadTemplate[]> {
    return Array.from(this.templates.values())
      .filter(t => operationIds.includes(t.operationId));
  }

  async findAll(): Promise<PayloadTemplate[]> {
    return Array.from(this.templates.values());
  }

  async count(options?: Omit<FindTemplatesOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const result = await this.find({ ...options, page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.total;
  }

  async exists(id: string): Promise<boolean> {
    return this.templates.has(id);
  }

  async deleteByOperationId(operationId: string): Promise<number> {
    let count = 0;
    for (const [id, template] of this.templates.entries()) {
      if (template.operationId === operationId) {
        this.templates.delete(id);
        count++;
      }
    }
    return count;
  }

  async deleteByOperationIds(operationIds: string[]): Promise<number> {
    let count = 0;
    for (const [id, template] of this.templates.entries()) {
      if (operationIds.includes(template.operationId)) {
        this.templates.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all templates (useful for testing)
   */
  clear(): void {
    this.templates.clear();
  }

  private getSortValue(template: PayloadTemplate, sortBy?: string): unknown {
    switch (sortBy) {
      case 'name':
        return template.name;
      case 'operationId':
        return template.operationId;
      case 'createdAt':
      default:
        return template.createdAt;
    }
  }
}

/**
 * Creates an InMemoryTestTemplateRepository instance
 * @returns InMemoryTestTemplateRepository instance
 */
export function createInMemoryTestTemplateRepository(): InMemoryTestTemplateRepository {
  return new InMemoryTestTemplateRepository();
}
