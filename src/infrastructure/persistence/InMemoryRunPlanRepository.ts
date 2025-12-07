/**
 * InMemoryRunPlanRepository
 * In-memory implementation of IRunPlanRepository
 */

import {
  IRunPlanRepository,
  FindRunPlansOptions,
  PaginatedResult,
  PaginationOptions,
  createPaginatedResult,
  getDefaultPaginationOptions,
} from '../../domain/repositories';
import { RunPlan, RunPlanStatus } from '../../domain/models';

/**
 * InMemoryRunPlanRepository class
 * Stores run plans in memory using a Map
 */
export class InMemoryRunPlanRepository implements IRunPlanRepository {
  private runPlans: Map<string, RunPlan> = new Map();

  async create(plan: RunPlan): Promise<RunPlan> {
    this.runPlans.set(plan.runId, plan);
    return plan;
  }

  async update(plan: RunPlan): Promise<RunPlan> {
    if (!this.runPlans.has(plan.runId)) {
      throw new Error(`Run plan not found: ${plan.runId}`);
    }
    this.runPlans.set(plan.runId, plan);
    return plan;
  }

  async delete(runId: string): Promise<boolean> {
    return this.runPlans.delete(runId);
  }

  async findById(runId: string): Promise<RunPlan | null> {
    return this.runPlans.get(runId) ?? null;
  }

  async find(options?: FindRunPlansOptions): Promise<PaginatedResult<RunPlan>> {
    const opts = { ...getDefaultPaginationOptions(), ...options };
    let items = Array.from(this.runPlans.values());

    // Apply filters
    if (opts.specId) {
      items = items.filter(p => p.specId === opts.specId);
    }

    if (opts.envName) {
      items = items.filter(p => p.envName === opts.envName);
    }

    if (opts.status) {
      items = items.filter(p => p.status === opts.status);
    }

    if (opts.statuses && opts.statuses.length > 0) {
      items = items.filter(p => opts.statuses!.includes(p.status));
    }

    if (opts.createdBy) {
      items = items.filter(p => p.createdBy === opts.createdBy);
    }

    if (opts.tag) {
      items = items.filter(p => p.tags.includes(opts.tag!));
    }

    if (opts.createdAfter) {
      items = items.filter(p => p.createdAt >= opts.createdAfter!);
    }

    if (opts.createdBefore) {
      items = items.filter(p => p.createdAt <= opts.createdBefore!);
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

  async findBySpecId(specId: string, options?: PaginationOptions): Promise<PaginatedResult<RunPlan>> {
    return this.find({ ...options, specId });
  }

  async findByStatus(status: RunPlanStatus, options?: PaginationOptions): Promise<PaginatedResult<RunPlan>> {
    return this.find({ ...options, status });
  }

  async findLatestBySpecId(specId: string): Promise<RunPlan | null> {
    const plans = Array.from(this.runPlans.values())
      .filter(p => p.specId === specId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return plans[0] ?? null;
  }

  async findRunning(): Promise<RunPlan[]> {
    return Array.from(this.runPlans.values())
      .filter(p => p.status === 'running' || p.status === 'paused');
  }

  async updateStatus(runId: string, status: RunPlanStatus): Promise<RunPlan> {
    const plan = this.runPlans.get(runId);
    if (!plan) {
      throw new Error(`Run plan not found: ${runId}`);
    }

    const updated: RunPlan = { ...plan, status };
    
    if (status === 'running' && !plan.startedAt) {
      updated.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updated.completedAt = new Date();
    }

    this.runPlans.set(runId, updated);
    return updated;
  }

  async count(options?: Omit<FindRunPlansOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>): Promise<number> {
    const result = await this.find({ ...options, page: 1, limit: Number.MAX_SAFE_INTEGER });
    return result.total;
  }

  async exists(runId: string): Promise<boolean> {
    return this.runPlans.has(runId);
  }

  async deleteBySpecId(specId: string): Promise<number> {
    let count = 0;
    for (const [runId, plan] of this.runPlans.entries()) {
      if (plan.specId === specId) {
        this.runPlans.delete(runId);
        count++;
      }
    }
    return count;
  }

  async deleteCompletedOlderThan(olderThan: Date): Promise<number> {
    let count = 0;
    for (const [runId, plan] of this.runPlans.entries()) {
      if (
        (plan.status === 'completed' || plan.status === 'failed' || plan.status === 'cancelled') &&
        plan.completedAt &&
        plan.completedAt < olderThan
      ) {
        this.runPlans.delete(runId);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all run plans (useful for testing)
   */
  clear(): void {
    this.runPlans.clear();
  }

  private getSortValue(plan: RunPlan, sortBy?: string): unknown {
    switch (sortBy) {
      case 'status':
        return plan.status;
      case 'startedAt':
        return plan.startedAt ?? new Date(0);
      case 'completedAt':
        return plan.completedAt ?? new Date(0);
      case 'createdAt':
      default:
        return plan.createdAt;
    }
  }
}

/**
 * Creates an InMemoryRunPlanRepository instance
 * @returns InMemoryRunPlanRepository instance
 */
export function createInMemoryRunPlanRepository(): InMemoryRunPlanRepository {
  return new InMemoryRunPlanRepository();
}
